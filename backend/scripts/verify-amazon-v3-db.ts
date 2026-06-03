import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : {
          rejectUnauthorized: false,
        },
});

async function main() {
  const client = await pool.connect();
  try {
    const site = await client.query<{ id: string }>("select id from demo_sites where slug = 'amazon'");
    const siteId = site.rows[0]?.id;
    if (!siteId) {
      throw new Error("Amazon demo site not found.");
    }

    const totals = await client.query(
      `
      select
        (select count(*) from products where demo_site_id = $1)::int as products,
        (
          select count(*)
          from product_reviews pr
          join products p on p.id = pr.product_id
          where p.demo_site_id = $1
        )::int as reviews,
        (
          select count(*)
          from product_review_profiles pp
          join product_reviews pr on pr.id = pp.review_id
          join products p on p.id = pr.product_id
          where p.demo_site_id = $1
        )::int as profiles,
        (
          select count(*)
          from product_review_evidence pre
          join product_reviews pr on pr.id = pre.review_id
          join products p on p.id = pr.product_id
          where p.demo_site_id = $1
        )::int as evidence,
        (
          select count(*)
          from product_attribute_definitions
          where demo_site_id = $1
        )::int as attributes
      `,
      [siteId],
    );

    const categoryCounts = await client.query(
      `
      select pc.name as category, count(p.id)::int as products
      from product_categories pc
      join products p on p.category_id = pc.id
      where pc.demo_site_id = $1
      group by pc.name
      order by pc.name
      `,
      [siteId],
    );

    const reviewStats = await client.query(
      `
      with counts as (
        select p.id, count(pr.id)::int as reviews
        from products p
        left join product_reviews pr on pr.product_id = p.id
        where p.demo_site_id = $1
        group by p.id
      )
      select
        min(reviews)::int as min_reviews,
        max(reviews)::int as max_reviews,
        round(avg(reviews)::numeric, 2)::float as avg_reviews,
        count(*) filter (where reviews between 5 and 7)::int as low_review_products,
        count(*) filter (where reviews >= 50)::int as high_review_products
      from counts
      `,
      [siteId],
    );

    const productRatingStats = await client.query(
      `
      select
        min(rating)::float as min_rating,
        percentile_cont(0.5) within group (order by rating)::float as median_rating,
        max(rating)::float as max_rating,
        round(avg(rating)::numeric, 2)::float as avg_rating,
        count(*) filter (where rating >= 4.0)::int as products_rated_4_plus
      from products
      where demo_site_id = $1
      `,
      [siteId],
    );

    const evidenceStats = await client.query(
      `
      with counts as (
        select pr.id, count(pre.id)::int as evidence
        from product_reviews pr
        join products p on p.id = pr.product_id
        left join product_review_evidence pre on pre.review_id = pr.id
        where p.demo_site_id = $1
        group by pr.id
      )
      select
        min(evidence)::int as min_evidence,
        max(evidence)::int as max_evidence,
        round(avg(evidence)::numeric, 2)::float as avg_evidence
      from counts
      `,
      [siteId],
    );

    const ratings = await client.query(
      `
      select pr.rating, count(*)::int as reviews
      from product_reviews pr
      join products p on p.id = pr.product_id
      where p.demo_site_id = $1
      group by pr.rating
      order by pr.rating desc
      `,
      [siteId],
    );

    const profileCoverage = await client.query(
      `
      select body_type, count(*)::int as reviews
      from product_review_profiles pp
      join product_reviews pr on pr.id = pp.review_id
      join products p on p.id = pr.product_id
      where p.demo_site_id = $1
      and body_type in ('petite', 'tall', 'plus')
      group by body_type
      order by body_type
      `,
      [siteId],
    );

    const issueClustering = await client.query(
      `
      with issue_counts as (
        select pr.product_id, pre.issue_type, count(*)::int as issue_count
        from product_review_evidence pre
        join product_reviews pr on pr.id = pre.review_id
        join products p on p.id = pr.product_id
        where p.demo_site_id = $1
        and pre.sentiment = 'negative'
        and pre.issue_type <> 'none'
        group by pr.product_id, pre.issue_type
      ),
      ranked as (
        select
          product_id,
          issue_type,
          issue_count,
          sum(issue_count) over (partition by product_id) as total_negative,
          row_number() over (partition by product_id order by issue_count desc, issue_type) as issue_rank
        from issue_counts
      ),
      clustered as (
        select
          product_id,
          max(total_negative)::int as total_negative,
          sum(issue_count) filter (where issue_rank = 1)::int as top_issue_negative,
          sum(issue_count) filter (where issue_rank <= 3)::int as top_three_negative
        from ranked
        group by product_id
      )
      select
        count(*) filter (where total_negative >= 12)::int as products_with_12_plus_negative,
        count(*) filter (where total_negative >= 12 and top_three_negative::float / total_negative >= 0.52)::int as clustered_products,
        count(*) filter (where total_negative >= 12 and top_issue_negative::float / total_negative <= 0.72)::int as diverse_issue_products,
        count(*) filter (where total_negative >= 12 and top_issue_negative::float / total_negative > 0.92)::int as overconcentrated_issue_products,
        round(avg(top_issue_negative::float / nullif(total_negative, 0)) filter (where total_negative >= 12)::numeric, 3)::float as avg_top_issue_share,
        round(avg(top_three_negative::float / nullif(total_negative, 0)) filter (where total_negative >= 12)::numeric, 3)::float as avg_top_three_share
      from clustered
      `,
      [siteId],
    );

    const productRisk = await client.query(
      `
      with per_product as (
        select
          p.id,
          p.rating,
          p.review_count,
          count(pre.id) filter (where pre.sentiment = 'negative')::int as negative_evidence
        from products p
        left join product_reviews pr on pr.product_id = p.id
        left join product_review_evidence pre on pre.review_id = pr.id
        where p.demo_site_id = $1
        group by p.id, p.rating, p.review_count
      )
      select
        count(*) filter (where negative_evidence = 0)::int as products_with_no_negative_evidence,
        count(*) filter (where negative_evidence between 1 and 5)::int as products_with_1_to_5_negative_evidence,
        count(*) filter (where negative_evidence >= 20)::int as products_with_20_plus_negative_evidence,
        count(*) filter (where review_count <= 7 and rating >= 4.3)::int as high_rating_low_review_products,
        count(*) filter (where rating >= 4.2 and negative_evidence >= 3)::int as high_rating_with_complaints,
        count(*) filter (where rating < 3.0)::int as low_rating_products,
        count(*) filter (where rating < 3.5)::int as below_3_5_products
      from per_product
      `,
      [siteId],
    );

    const quality = await client.query(
      `
      select
        (
          select count(*)
          from (
            select pr.body
            from product_reviews pr
            join products p on p.id = pr.product_id
            where p.demo_site_id = $1
            group by pr.body
            having count(*) > 1
          ) duplicates
        )::int as duplicate_review_bodies,
        (
          select count(*)
          from product_review_evidence pre
          join product_reviews pr on pr.id = pre.review_id
          join products p on p.id = pr.product_id
          where p.demo_site_id = $1
          and position(pre.evidence_text in pr.body) = 0
        )::int as evidence_text_mismatch,
        (
          select count(*)
          from product_reviews pr
          join products p on p.id = pr.product_id
          join product_categories pc on pc.id = p.category_id
          where p.demo_site_id = $1
          and pc.name in ('Footwear', 'Bags', 'Accessories')
          and (pr.body ~* '(sleeve|armhole|lapel|bodice|waistband|inseam|upper body|소매|암홀|상체)')
        )::int as context_mismatch
      `,
      [siteId],
    );

    const assetCoverage = await client.query(
      `
      with asset_flags as (
        select
          p.id,
          bool_or(pa.asset_type = 'primary' and btrim(pa.url) <> '') as has_primary,
          bool_or(pa.asset_type = 'description' and btrim(pa.url) <> '') as has_description,
          bool_or(pa.asset_type = 'brand' and btrim(pa.url) <> '') as has_brand,
          count(pa.id)::int as asset_count
        from products p
        left join product_assets pa on pa.product_id = p.id
        where p.demo_site_id = $1
        group by p.id
      )
      select
        count(*)::int as products,
        count(*) filter (where has_primary)::int as products_with_primary,
        count(*) filter (where has_description)::int as products_with_description,
        count(*) filter (where has_brand)::int as products_with_brand,
        sum(asset_count)::int as total_assets,
        count(*) filter (
          where not coalesce(has_primary, false)
          or not coalesce(has_description, false)
          or not coalesce(has_brand, false)
        )::int as products_missing_required_assets,
        (
          select count(*)::int
          from product_assets pa
          join products p on p.id = pa.product_id
          where p.demo_site_id = $1
          and btrim(pa.url) = ''
        ) as blank_asset_urls,
        (
          select count(*)::int
          from product_assets pa
          join products p on p.id = pa.product_id
          where p.demo_site_id = $1
          and pa.url !~* '^https?://'
        ) as non_http_asset_urls
      from asset_flags
      `,
      [siteId],
    );

    const missingAssetProducts = await client.query(
      `
      with asset_flags as (
        select
          p.external_id,
          p.name,
          bool_or(pa.asset_type = 'primary' and btrim(pa.url) <> '') as has_primary,
          bool_or(pa.asset_type = 'description' and btrim(pa.url) <> '') as has_description,
          bool_or(pa.asset_type = 'brand' and btrim(pa.url) <> '') as has_brand
        from products p
        left join product_assets pa on pa.product_id = p.id
        where p.demo_site_id = $1
        group by p.id, p.external_id, p.name
      )
      select
        external_id,
        name,
        coalesce(has_primary, false) as has_primary,
        coalesce(has_description, false) as has_description,
        coalesce(has_brand, false) as has_brand
      from asset_flags
      where not coalesce(has_primary, false)
      or not coalesce(has_description, false)
      or not coalesce(has_brand, false)
      order by external_id
      limit 20
      `,
      [siteId],
    );

    const contextMismatchSamples = await client.query(
      `
      select
        p.external_id as product_external_id,
        p.name as product_name,
        pc.name as category,
        pr.external_id as review_external_id,
        pr.title,
        pr.body
      from product_reviews pr
      join products p on p.id = pr.product_id
      join product_categories pc on pc.id = p.category_id
      where p.demo_site_id = $1
      and pc.name in ('Footwear', 'Bags', 'Accessories')
      and (pr.body ~* '(sleeve|armhole|lapel|bodice|waistband|inseam|upper body|소매|암홀|상체)')
      order by p.external_id, pr.external_id
      limit 20
      `,
      [siteId],
    );

    const output = {
      totals: totals.rows[0],
      categoryCounts: categoryCounts.rows,
      reviewStats: reviewStats.rows[0],
      evidenceStats: evidenceStats.rows[0],
      productRatingStats: productRatingStats.rows[0],
      ratingDistribution: ratings.rows,
      profileCoverage: profileCoverage.rows,
      issueClustering: issueClustering.rows[0],
      productRisk: productRisk.rows[0],
      assetCoverage: assetCoverage.rows[0],
      missingAssetProducts: missingAssetProducts.rows,
      contextMismatchSamples: contextMismatchSamples.rows,
      qualityChecks: quality.rows[0],
    };

    console.log(JSON.stringify(output, null, 2));

    const assetRow = assetCoverage.rows[0];
    if (
      Number(assetRow.products_missing_required_assets) > 0 ||
      Number(assetRow.blank_asset_urls) > 0 ||
      Number(assetRow.non_http_asset_urls) > 0
    ) {
      throw new Error("Amazon image asset verification failed.");
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

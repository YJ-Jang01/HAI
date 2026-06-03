-- Keep the Amazon Reviews 2023 shopping_* schema and logging infrastructure.
-- Remove legacy synthetic catalog schemas after backup.

delete from interaction_logs;
delete from demo_sites where slug <> 'amazon';

insert into demo_sites (slug, display_name)
values ('amazon', 'AIMAZON')
on conflict (slug) do update set display_name = excluded.display_name;

drop table if exists product_review_evidence cascade;
drop table if exists product_review_profiles cascade;
drop table if exists product_reviews cascade;
drop table if exists product_rating_breakdown cascade;
drop table if exists product_attribute_values cascade;
drop table if exists product_attribute_options cascade;
drop table if exists product_attribute_definitions cascade;
drop table if exists product_option_values cascade;
drop table if exists product_option_groups cascade;
drop table if exists product_features cascade;
drop table if exists product_assets cascade;
drop table if exists products cascade;
drop table if exists product_subcategories cascade;
drop table if exists product_categories cascade;

drop table if exists media_episode_assets cascade;
drop table if exists media_hero_items cascade;
drop table if exists media_shelf_items cascade;
drop table if exists media_item_tags cascade;
drop table if exists media_assets cascade;
drop table if exists media_episodes cascade;
drop table if exists media_shelves cascade;
drop table if exists media_tags cascade;
drop table if exists media_items cascade;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchHome, fetchItemDetail } from "./dataAdapter.js";

const primaryButtonClass =
  "min-h-[42px] cursor-pointer rounded border-0 bg-white px-6 py-2.5 text-base font-bold text-black transition hover:bg-[#e6e6e6]";
const secondaryButtonClass =
  "min-h-[42px] cursor-pointer rounded border-0 bg-[#6d6d6e]/80 px-6 py-2.5 text-base font-bold text-white transition hover:bg-[#777]";

function Header() {
  return (
    <header className="fixed top-0 z-10 flex min-h-[58px] w-full items-center bg-gradient-to-b from-black/75 to-transparent px-[4%] py-2.5 max-[720px]:flex-col max-[720px]:items-start max-[720px]:gap-2">
      <div className="mr-6 text-[32px] font-extrabold tracking-normal text-[#e50914]">AIFLIX</div>
      <nav className="flex min-w-0 items-center gap-5 max-[720px]:w-full max-[720px]:overflow-x-auto max-[720px]:pb-1" aria-label="Main navigation">
        <a className="whitespace-nowrap text-sm text-[#e5e5e5] no-underline transition hover:text-[#b3b3b3]" href="#home">
          Home
        </a>
        <a className="whitespace-nowrap text-sm text-[#e5e5e5] no-underline transition hover:text-[#b3b3b3]" href="#shows">
          TV Shows
        </a>
        <a className="whitespace-nowrap text-sm text-[#e5e5e5] no-underline transition hover:text-[#b3b3b3]" href="#movies">
          Movies
        </a>
        <a className="whitespace-nowrap text-sm text-[#e5e5e5] no-underline transition hover:text-[#b3b3b3]" href="#new">
          New & Popular
        </a>
      </nav>
    </header>
  );
}

function Hero({ item, onPlay, onMoreInfo }) {
  if (!item) {
    return <section className="relative flex min-h-[80vh] items-center bg-[#111] px-[4%] pb-[60px] pt-[88px] max-[720px]:min-h-[70vh] max-[720px]:pt-[120px]" />;
  }

  return (
    <section
      className="relative flex min-h-[80vh] items-center bg-cover bg-center px-[4%] pb-[60px] pt-[88px] max-[720px]:min-h-[70vh] max-[720px]:pt-[120px]"
      style={{ backgroundImage: `url(${item.heroUrl || item.thumbnailUrl})` }}
    >
      <div className="relative z-[2] max-w-[620px]">
        <h1 className="m-0 mb-3 text-[clamp(2.2rem,5vw,4.5rem)] leading-[1.02] tracking-normal">{item.title}</h1>
        <p className="m-0 mb-6 text-[clamp(1rem,1.4vw,1.25rem)] leading-[1.55] [text-shadow:2px_2px_4px_rgba(0,0,0,0.65)]">{item.description}</p>
        <div className="flex flex-wrap items-center gap-2.5">
          <button className={primaryButtonClass} type="button" onClick={() => onPlay(item)}>
            Play
          </button>
          <button className={secondaryButtonClass} type="button" onClick={() => onMoreInfo(item)}>
            More Info
          </button>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
    </section>
  );
}

function SearchBar({ value, onChange, onSearch }) {
  return (
    <div className="relative z-[5] mt-[-30px] px-[4%] py-5">
      <form
        className="flex flex-wrap items-center gap-2.5"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <input
          className="min-h-[42px] w-[min(280px,100%)] rounded border border-white bg-black/75 px-4 py-2.5 text-white outline-none placeholder:text-white/55"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Genres: relaxing, action..."
          aria-label="Search media"
        />
        <button className="min-h-[42px] cursor-pointer rounded border-0 bg-[#e50914] px-6 py-2.5 text-base font-bold text-white transition hover:bg-[#f6121d]" type="submit">
          Search
        </button>
      </form>
    </div>
  );
}

function MediaCard({ item, onOpen }) {
  return (
    <button
      className="group relative aspect-video flex-[0_0_clamp(180px,16vw,260px)] cursor-pointer overflow-hidden rounded border-0 bg-cover bg-center transition-transform duration-200 hover:z-[8] hover:scale-[1.18] focus-visible:z-[8] focus-visible:scale-[1.18] focus-visible:outline-none max-[720px]:flex-[0_0_72vw]"
      type="button"
      onClick={() => onOpen(item)}
      aria-label={item.title}
      style={{ backgroundImage: `url(${item.thumbnailUrl})` }}
    >
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2.5 pb-2 pt-7 text-left text-sm font-bold text-white">{item.title}</span>
    </button>
  );
}

function ShelfRow({ shelf, onOpen }) {
  return (
    <section className="mb-[3vw]" aria-labelledby={`${shelf.key}-title`}>
      <h2 id={`${shelf.key}-title`} className="m-0 mb-3 px-[4%] text-[clamp(1.15rem,1.4vw,1.55rem)] font-extrabold tracking-normal text-[#e5e5e5]">
        {shelf.title}
      </h2>
      <div className="flex gap-2 overflow-x-auto overflow-y-visible px-[4%] pb-[42px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {shelf.items.map((item) => (
          <MediaCard key={item.id} item={item} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}

function DetailModal({ item, onClose, onPlay }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!item) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [item]);

  useEffect(() => {
    if (!item || !videoRef.current) {
      return;
    }
    videoRef.current.play().catch(() => {});
  }, [item]);

  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/75 py-[50px]" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div className="relative mx-auto w-[min(90%,850px)] overflow-hidden rounded-lg bg-[#181818] shadow-[0_10px_30px_rgba(0,0,0,0.55)]">
        <button className="absolute right-5 top-5 z-10 flex h-[45px] w-[45px] cursor-pointer items-center justify-center rounded-full border-0 bg-black/60 text-[35px] leading-none text-white hover:bg-white/15" type="button" onClick={onClose} aria-label="Close detail">
          ×
        </button>

        <div className="relative aspect-video w-full bg-black">
          <video className="h-full w-full object-cover" ref={videoRef} src={item.videoUrl} autoPlay muted loop playsInline poster={item.heroUrl} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/65 to-transparent" />
          <div className="absolute bottom-[5%] left-[5%] right-[5%] z-[2]">
            <h1 id="detail-title" className="m-0 mb-4 text-[clamp(1.8rem,3vw,3rem)] tracking-normal">
              {item.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2.5">
              <button className={primaryButtonClass} type="button" onClick={() => onPlay(item)}>
                재생
              </button>
              <button className="h-[42px] w-[42px] cursor-pointer rounded-full border-0 bg-[#2a2a2a]/80 p-0 text-2xl font-bold text-white hover:bg-[#3a3a3a]" type="button" aria-label="Add to list">
                +
              </button>
            </div>
          </div>
        </div>

        <div className="px-[5%] pb-8 pt-5">
          <p className="m-0 mb-10 text-[1.05rem] leading-relaxed text-[#d2d2d2]">{item.description}</p>

          <div>
            <h3 className="m-0 mb-5 text-[1.4rem] font-bold">회차</h3>
            <div className="grid">
              {item.episodes.map((episode, index) => (
                <button
                  key={episode.id}
                  className="grid cursor-pointer grid-cols-[30px_130px_minmax(0,1fr)_auto] items-center gap-[15px] border-0 border-b border-b-[#404040] bg-transparent p-[15px] text-left text-white transition hover:bg-[#333] max-[720px]:grid-cols-[24px_94px_minmax(0,1fr)]"
                  type="button"
                  onClick={() => window.alert(`${episode.title} 재생을 시작합니다.`)}
                >
                  <span className="text-[1.2rem] text-[#d2d2d2]">{index + 1}</span>
                  <span className="aspect-video w-[130px] rounded bg-cover bg-center max-[720px]:w-[94px]" style={{ backgroundImage: `url(${item.thumbnailUrl})` }} />
                  <span className="grid min-w-0 gap-1">
                    <span className="font-bold">{episode.title}</span>
                    <span className="text-sm text-[#a3a3a3]">{episode.description}</span>
                  </span>
                  <span className="whitespace-nowrap text-[#cfcfcf] max-[720px]:col-start-3">{episode.durationLabel}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function findFirstMatch(shelves, input) {
  const normalized = input.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  for (const shelf of shelves) {
    for (const item of shelf.items) {
      const titleMatches = item.title.toLowerCase().includes(normalized);
      const tagMatches = item.tagSlugs.some((tag) => tag.toLowerCase().includes(normalized));
      if (titleMatches || tagMatches) {
        return item;
      }
    }
  }

  return null;
}

export default function App() {
  const [home, setHome] = useState({ demo: "netflix", hero: null, shelves: [] });
  const [status, setStatus] = useState("loading");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    let isMounted = true;

    fetchHome()
      .then((nextHome) => {
        if (!isMounted) return;
        setHome(nextHome);
        setStatus("ready");
      })
      .catch((error) => {
        console.error(error);
        if (!isMounted) return;
        setStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const openItem = useCallback(async (item) => {
    setSelectedItem(item);
    try {
      setSelectedItem(await fetchItemDetail(item));
    } catch (error) {
      console.error(error);
    }
  }, []);

  const handleSearch = useCallback(() => {
    const match = findFirstMatch(home.shelves, search);
    if (match) {
      openItem(match);
      return;
    }
    window.alert("검색 결과가 없습니다!");
  }, [home.shelves, openItem, search]);

  const shelves = useMemo(() => home.shelves.filter((shelf) => shelf.items.length > 0), [home.shelves]);

  return (
    <>
      <Header />
      <Hero item={home.hero} onPlay={() => window.alert("콘텐츠 재생을 시작합니다...")} onMoreInfo={openItem} />
      <SearchBar value={search} onChange={setSearch} onSearch={handleSearch} />

      <main className="pb-[60px] pt-5">
        {status === "loading" ? <div className="px-[4%] py-6 text-[#d2d2d2]">Loading...</div> : null}
        {status === "error" ? <div className="px-[4%] py-6 text-[#d2d2d2]">데이터를 불러올 수 없습니다.</div> : null}
        {shelves.map((shelf) => (
          <ShelfRow key={shelf.key} shelf={shelf} onOpen={openItem} />
        ))}
      </main>

      <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onPlay={() => window.alert("콘텐츠 재생을 시작합니다...")} />
    </>
  );
}

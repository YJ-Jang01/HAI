const categories = [
  { title: "Trending Now", tags: ["action", "drama"] },
  { title: "Relaxing Sunday", tags: ["relaxing"] },
  { title: "Blockbuster Movies", tags: ["action"] },
  { title: "New Releases", tags: ["drama", "relaxing"] },
  { title: "My List", tags: ["action"] }
];

let fullData = [];
async function loadData() {
  try {
    const response = await fetch('data.json'); 
    fullData = await response.json();
    render(); 
  } catch (error) {
    console.error("데이터를 불러오는 중 오류 발생:", error);
    alert("데이터를 불러올 수 없습니다. JSON 파일과 서버 설정을 확인하세요.");
  }
}


function render() {
  const main = document.querySelector("main");
  if (!main) return;
  main.innerHTML = ""; 

  categories.forEach((cat, index) => {
    const section = document.createElement("section");
    section.className = "category-section";
    section.style.marginBottom = "3vw";

    const h2 = document.createElement("h2");
    h2.innerText = cat.title;
    h2.style.paddingLeft = "4%";
    h2.style.color = "#e5e5e5";
    section.appendChild(h2);

    const row = document.createElement("div");
    row.className = "row";

    const startIndex = index * 6;
    const categoryItems = fullData.slice(startIndex, startIndex + 6);

    categoryItems.forEach(item => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.backgroundImage = `url(${item.img})`;
      
      card.onclick = () => openExpand(item);
      row.appendChild(card);
    });

    section.appendChild(row);
    main.appendChild(section);
  });

  if (fullData.length > 0) {
    setHero(fullData[0]);
  }
}


function setHero(item) {
  const hero = document.getElementById("hero");
  const title = document.getElementById("hero-title");
  const desc = document.getElementById("hero-desc");

  if (hero) hero.style.backgroundImage = `url(${item.img})`;
  if (title) title.innerText = item.name;
  if (desc) desc.innerText = item.desc;
}


function openExpand(item) {
  const expand = document.getElementById("expand");
  const video = document.getElementById("bg-video");
  const epList = document.getElementById("episodes-list");

  if (!expand || !video) return;

  expand.style.display = "block";
  document.body.style.overflow = "hidden";

  video.src = item.video;
  video.play().catch(e => console.log("자동 재생 차단됨: ", e));

  document.getElementById("expand-title").innerText = item.name;
  document.getElementById("expand-desc").innerText = item.desc;

  if (epList) {
    epList.innerHTML = ""; 
    if (item.episodes && item.episodes.length > 0) {
      item.episodes.forEach((ep, index) => {
        const epDiv = document.createElement("div");
        epDiv.className = "episode-item";
        epDiv.innerHTML = `
          <div class="ep-num">${index + 1}</div>
          <div class="ep-img" style="background-image: url(${item.img})"></div>
          <div class="ep-info">
            <div class="ep-title">${ep.title}</div>
            <div class="ep-desc">${ep.desc}</div>
          </div>
          <div class="ep-duration">${ep.duration}</div>
        `;
        epDiv.onclick = (e) => {
          e.stopPropagation();
          alert(`${ep.title} 재생을 시작합니다.`);
        };
        epList.appendChild(epDiv);
      });
    }
  }
}


function closeExpand() {
  const expand = document.getElementById("expand");
  const video = document.getElementById("bg-video");

  if (expand) expand.style.display = "none";
  document.body.style.overflow = "auto";
  
  if (video) {
    video.pause();
    video.src = "";
  }
}


function runAI() {
  const input = document.getElementById("input").value.toLowerCase();
  if (!input) return;

  const filtered = fullData.find(item => 
    item.tag.includes(input) || item.name.toLowerCase().includes(input)
  );

  if (filtered) {
    openExpand(filtered);
  } else {
    alert("검색 결과가 없습니다!");
  }
}

function playContent() {
  alert("▶ 콘텐츠 재생을 시작합니다...");
}

loadData();
import fs from "fs";
import path from "path";
import type { Article, SiteContent } from "./types.js";

function paragraphs(html: string): string {
  const parts = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()
  );
  return parts.join("\n\n");
}

function articlesFrom(file: string): Article[] {
  const html = fs.readFileSync(file, "utf8");
  const blocks = [...html.matchAll(/<article class="article" id="([^"]+)">([\s\S]*?)<\/article>/g)];
  return blocks.map((block, index) => {
    const inner = block[2];
    const title = (inner.match(/<h2>([\s\S]*?)<\/h2>/) || ["", ""])[1].trim();
    return {
      id: block[1],
      title,
      body: paragraphs(inner),
      image: "",
      visible: true,
      order: index + 1,
    };
  });
}

function aboutFrom(file: string) {
  const html = fs.readFileSync(file, "utf8");
  const prose = (html.match(/<div class="prose center">([\s\S]*?)<\/div>/) || ["", ""])[1];
  const cards = [...html.matchAll(/<article class="card">([\s\S]*?)<\/article>/g)].map((m) => m[1]);
  const cardTitle = (raw: string) => (raw.match(/<h3>([\s\S]*?)<\/h3>/) || ["", ""])[1].trim();
  const cardBody = (raw: string) => paragraphs(raw);
  return {
    heading: (prose.match(/<h2>([\s\S]*?)<\/h2>/) || ["", "Hakkımızda"])[1].trim(),
    body: paragraphs(prose),
    goalsTitle: (html.match(/<h2 class="center">([\s\S]*?)<\/h2>/) || ["", "Net Hedefler!"])[1].trim(),
    visionTitle: cardTitle(cards[0] || ""),
    vision: cardBody(cards[0] || ""),
    missionTitle: cardTitle(cards[1] || ""),
    mission: cardBody(cards[1] || ""),
  };
}

export function createSeed(root: string): SiteContent {
  const about = aboutFrom(path.join(root, "hakkimizda.html"));
  const articles = articlesFrom(path.join(root, "hizmetlerimiz.html"));
  articles.push({
    id: "uzay",
    title: "Uzay Havacılık",
    body: "Uzay ve havacılık alanında platform, sistem ve tedarik çözümleri sunuyoruz. Savaş uçağı, helikopter, insansız hava aracı ve küçük uydu projelerinde teknik destek ve dış ticaret süreçlerini yönetiyoruz.",
    image: "/uploads/turk-savas-ucagi.jpg",
    visible: true,
    order: articles.length + 1,
  });

  return {
    hero: {
      eyebrow: "Her sektöre lider dokunuş!",
      title: "İnşaattan Enerjiye; her alanda çözüm ortağınız!",
      text: "Güven, kalite ve sürdürülebilirlik odaklı yaklaşımımızla işinizi ileri taşıyoruz. Profesyonel ekibimizle her adımda yanınızdayız.",
      image: "/assets/banner.webp",
    },
    sectors: [
      {
        id: "insaat",
        title: "İnşaat",
        summary: "Modern yapılar için yenilikçi çözümler sunuyoruz. Projelendirmeden teslimata kadar her aşamada kaliteli ve güvenilir hizmet sağlıyoruz.",
        body: "",
        icon: "home",
        image: "",
        highlight: false,
        visible: true,
        order: 1,
        gallery: [],
      },
      {
        id: "enerji",
        title: "Enerji",
        summary: "Aslanlar Dış Ticaret, yenilenebilir ve ileri enerji teknolojileriyle sürdürülebilir çözümler üretir. Mikroalg, IPLASMA ve mobil enerji sistemleriyle geleceğin enerji dönüşümüne yön verir.",
        body: "",
        icon: "energy",
        image: "",
        highlight: true,
        visible: true,
        order: 2,
        gallery: [],
      },
      {
        id: "otomotiv",
        title: "Otomotiv Sanayi",
        summary: "Yedek parça, teknik destek ve yenilikçi çözümlerle otomotiv sektörünün ihtiyaçlarına cevap veriyoruz. Güçlü ve hızlı lojistik ağımızla fark yaratıyoruz.",
        body: "",
        icon: "car",
        image: "",
        highlight: false,
        visible: true,
        order: 3,
        gallery: [],
      },
      {
        id: "lojistik",
        title: "Lojistik",
        summary: "Hızlı, güvenilir ve uygun maliyetli lojistik çözümlerimizle tedarik zincirinizi güçlendiriyoruz. Her sektöre özel stratejik taşımacılık hizmetleri sunuyoruz.",
        body: "",
        icon: "ship",
        image: "",
        highlight: false,
        visible: true,
        order: 4,
        gallery: [],
      },
      {
        id: "uzay",
        title: "Uzay Havacılık",
        summary: "Savaş uçağı, helikopter, insansız hava aracı ve küçük uydu projelerinde teknik destek ve tedarik çözümleri sunuyoruz.",
        body: "Uzay ve havacılık alanında platform, sistem ve tedarik çözümleri sunuyoruz. Savaş uçağı, helikopter, insansız hava aracı ve küçük uydu projelerinde teknik destek ve dış ticaret süreçlerini yönetiyoruz.",
        icon: "plane",
        image: "/uploads/turk-savas-ucagi.jpg",
        highlight: false,
        visible: true,
        order: 5,
        gallery: [
          { id: "g1", image: "/uploads/turk-savas-ucagi.jpg", caption: "Türk savaş uçağı", order: 1 },
          { id: "g2", image: "/uploads/rus-helikopter.jpg", caption: "Rus helikopter", order: 2 },
          { id: "g3", image: "/uploads/mi17.jpg", caption: "M17", order: 3 },
          { id: "g4", image: "/uploads/su57.jpg", caption: "Su-57", order: 4 },
          { id: "g5", image: "/uploads/uydu.jpg", caption: "Modern ufak uydu", order: 5 },
          { id: "g6", image: "/uploads/dron.jpg", caption: "Dron", order: 6 },
        ],
      },
    ],
    quality: {
      kicker: "Aslanlar Dış Ticaret",
      title: "Güven, hız, kalite!",
      text: "Birçok sektöre hitap eden güvenilir ve kaliteli hizmetler sunuyoruz. Hızlı, etkili çözümlerle işinizi ileriye taşıyoruz.",
      image: "/assets/crane.webp",
      features: [
        {
          id: "f1",
          title: "Sektörel Çeşitlilik",
          text: "İnşaat, lojistik, otomotiv gibi birçok alanda uzmanlaşmış hizmetlerimizle geniş bir çözüm yelpazesi sunuyoruz. Farklı sektörlere hitap eden deneyimimizle işinizi büyütüyoruz.",
          order: 1,
        },
        {
          id: "f2",
          title: "Güvenilirlik ve Kalite",
          text: "Tüm süreçlerde güven ve kaliteyi önceliklendiriyoruz. Uzman ekibimizle her detayı titizlikle ele alarak sürdürülebilir ve başarılı projelere imza atıyoruz.",
          order: 2,
        },
        {
          id: "f3",
          title: "Hızlı ve Etkin Çözümler",
          text: "İş ortaklarımızın zamanını ve kaynaklarını en verimli şekilde kullanarak hızlı, ekonomik ve etkili çözümler sağlıyoruz. İhtiyaçlarınıza özel stratejiler geliştiriyoruz.",
          order: 3,
        },
      ],
    },
    portfolio: [
      {
        id: "p1",
        image: "/assets/an1.png",
        caption: "Modern ve sağlam projelerle yaşam alanlarına değer katıyoruz. Güvenilir, yenilikçi ve kaliteli çözümler sunuyoruz.",
        visible: true,
        order: 1,
      },
      {
        id: "p2",
        image: "/assets/an3.png",
        caption: "Hızlı ve güvenilir taşımacılık çözümleriyle tedarik zincirine kesintisiz destek veriyoruz.",
        visible: true,
        order: 2,
      },
      {
        id: "p3",
        image: "/assets/an4.png",
        caption: "Enerji yönetimi ve teknoloji altyapılarında yenilikçi hizmetler sunarak işletmenizi güçlendiriyoruz.",
        visible: true,
        order: 3,
      },
    ],
    expertise: {
      title: "Sektörel Uzmanlık",
      text: "Farklı sektörlerdeki tecrübemizle, her alanda ihtiyaçlarınıza özel çözümler sunuyoruz. Uzman ekibimizle işinizi büyütmek için yanınızdayız.",
      image: "/assets/expertise.webp",
      items: [
        { id: "e1", label: "Elektronik - Teknolojik çözümler.", order: 1 },
        { id: "e2", label: "İnşaat - Güvenilir yapılar.", order: 2 },
        { id: "e3", label: "Otomotiv - Güçlü destek.", order: 3 },
        { id: "e4", label: "Lojistik - Hızlı taşımacılık.", order: 4 },
        { id: "e5", label: "Enerji", order: 5 },
      ],
    },
    about: {
      eyebrow: "Biz Kimiz?",
      title: "İşinizde Güç Birliği!",
      lead: "Kalite, Güven ve Uzmanlıkla Sektörlere Özel Çözümler Sunuyoruz.",
      image: "/assets/an3.png",
      ...about,
    },
    articles,
    contact: {
      eyebrow: "İletişim",
      title: "Bize Ulaşın!",
      text: "Sorularınız, talepleriniz veya iş birliği fırsatları için bizimle iletişime geçmekten çekinmeyin. Ekibimiz size en kısa sürede yardımcı olmaktan mutluluk duyacaktır.",
      image: "/uploads/cotna1.webp",
      email: "info@aslanlardisticaret.com",
      address: "Zekeriyaköy Mah. Fırat Cad. No:5/1 SARIYER / İSTANBUL (Kızıl Elma Villa)",
      formTitle: "İletişim Formu",
      formText: "Bize ulaşmak için aşağıdaki formu doldurun. Taleplerinizi ve sorularınızı iletmeniz için buradayız!",
    },
    footer: {
      blurb: "Aslanlar Dış Ticaret olarak, geniş bir hizmet yelpazesiyle birçok sektöre değer katıyoruz.",
      vision: "Farklı sektörlerde sunduğumuz yenilikçi ve güvenilir çözümlerle ulusal ve uluslararası alanda lider bir marka olmak.",
      mission: "Müşterilerimize, inşaattan lojistiğe, gıdadan otomotive kadar her sektörde güvenilir ve kaliteli hizmet sunmak.",
      reach: "Sorularınız, talepleriniz veya iş birliği fırsatları için bizimle iletişime geçmekten çekinmeyin.",
    },
    legal: {
      cookies: "Bu site, sayfaların düzgün açılması için tarayıcınızın tuttuğu zorunlu teknik bilgileri kullanır. Zorunlu çerezler oturum, güvenlik ve sayfa tercihleri içindir.\n\nŞu an sitede reklam veya üçüncü taraf analiz çerezi çalıştırılmamaktadır. Çerezleri tarayıcı ayarlarınızdan silebilir veya engelleyebilirsiniz.",
      privacy: "Aslanlar Dış Ticaret, iletişim formu üzerinden ilettiğiniz ad, e-posta, telefon ve mesaj içeriğini yalnızca talebinize yanıt vermek için kullanır.\n\nBu bilgiler satılmaz. Verilerinizle ilgili soru veya silme talebi için info@aslanlardisticaret.com adresine yazabilirsiniz.",
    },
  };
}

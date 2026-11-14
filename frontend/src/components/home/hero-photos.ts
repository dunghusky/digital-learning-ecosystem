/**
 * Photos floating around the hero headline. All come from Wikimedia Commons under licenses
 * that require attribution, so every entry carries its credit (rendered by <PhotoCredits>).
 * Replace them with students' own photos as the archive grows.
 */
export interface HeroPhoto {
  /** Key under `home.photos` in the messages file (the place or craft shown). */
  key: string;
  src: string;
  width: number;
  height: number;
  author: string;
  license: string;
  sourceUrl: string;
  /** Position and size classes; photos sit in the side gutters around the headline. */
  className: string;
  /** How far (px) it follows the pointer: larger feels closer. */
  depth: number;
  rotate: number;
}

export const HERO_PHOTOS: HeroPhoto[] = [
  {
    key: "hienLuong",
    src: "/images/hero/hien-luong-bridge.webp",
    width: 500,
    height: 333,
    author: "Ryan Milani",
    license: "CC BY-SA 2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Tour_of_the_DMZ,_Vietnam_(17100711821).jpg",
    className: "top-[10%] left-[3%] w-56",
    depth: 22,
    rotate: -6,
  },
  {
    key: "hatArtisan",
    src: "/images/hero/conical-hat-artisan.webp",
    width: 500,
    height: 335,
    author: "Thomas Schoch – www.retas.de",
    license: "CC BY-SA 3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Hatter_Vietnam.jpg",
    className: "top-[42%] left-[9%] w-48",
    depth: 12,
    rotate: 4,
  },
  {
    key: "cuaTung",
    src: "/images/hero/cua-tung-boats.webp",
    width: 480,
    height: 640,
    author: "Phương Huy",
    license: "CC BY-SA 4.0",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:S%C3%B4ng_C%E1%BB%ADa_T%C3%B9ng_%E1%BB%9F_C%C3%A1t_S%C6%A1n,_T%E1%BA%BFt_n%C4%83m_2017_(2).jpg",
    className: "bottom-[4%] left-[2%] w-32",
    depth: 18,
    rotate: -3,
  },
  {
    key: "citadel",
    src: "/images/hero/quang-tri-citadel.webp",
    width: 500,
    height: 372,
    author: "Bùi Thụy Đào Nguyên",
    license: "CC BY-SA 4.0",
    sourceUrl:
      "https://commons.wikimedia.org/wiki/File:Th%C3%A0nh_c%E1%BB%95_Qu%E1%BA%A3ng_Tr%E1%BB%8B_Foto.jpg",
    className: "top-[8%] right-[3%] w-52",
    depth: 20,
    rotate: 5,
  },
  {
    key: "conicalHat",
    src: "/images/hero/conical-hat.webp",
    width: 500,
    height: 396,
    author: "steve the archivist",
    license: "CC BY-SA 2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Vietnamese_conical_hat_nonla.jpg",
    className: "top-[44%] right-[10%] w-40",
    depth: 10,
    rotate: -5,
  },
  {
    key: "phongNha",
    src: "/images/hero/phong-nha-cave.webp",
    width: 500,
    height: 281,
    author: "Andre Hospers",
    license: "CC BY 4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Dong_Hoi_Phong_Nha_grotten.jpg",
    className: "bottom-[6%] right-[2%] w-56",
    depth: 16,
    rotate: 3,
  },
];

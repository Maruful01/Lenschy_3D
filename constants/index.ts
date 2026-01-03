import { Client, Storage } from "appwrite";

export interface Product {
  $id: string;
  title: string;
  price: number;
  rate: number;
  material: string;
  lensWidth: number;
  lensHeight: number;
  bridge: number;
  templeLength: number;
  frameWidth: number;
  shape: string;
  description: string;
  img1: string;
  img2: string;
  img3: string;
  img4: string;
  product: number;
}

export interface Carousol {
  $id: string;
  url: string;
  lebel: string;
  route: string;
}
export interface FaceData {
  shape: string;
  img: string; // This will be a Base64 string of the image
  pd: string;
  gender: number;
  ageCategory: string;
  frameWidth: string;
  lensHeight: string;
  bridge: string;
  recommendedFrames: string;
  recommendationSummary: string;
  email: string;
  apiCalles: number;
}

export interface Order {
  $id: string;
  $createdAt: string;
  order: OrderData;
}
export interface OrderData {
  userName: string;
  area: string;
  phone: string;
  deliveryAddress: string;
  product1: string;
  product2: string;
  prescriptions: string;
  lens: string;
  email: string;
}
export interface LensSelection {
  package: {
    name: string;
    price: number;
    subtitle: string;
    features: string[];
  } | null;
  features: string[];
  prescription: string | null;
}

export interface CartProduct {
  $id: string;
  title: string;
  price: number;
  img1: string;
  product: number;
  package: LensSelection["package"];
  features: LensSelection["features"];
  prescription: LensSelection["prescription"];
}
interface NavLink {
  id: number;
  title: string;
  url: string;
}

interface DropdownLinks {
  id: number;
  name: string;
  link: string;
}

export const navigation: Ref<NavLink[]> = ref([
  { id: 1, title: "Eyeglasses", url: "/" },
  { id: 2, title: "Sunglasses", url: "/sunglasses" },
  { id: 3, title: "Kids Glasses", url: "/lenscess" },
  { id: 4, title: "Blog", url: "/about" },
]);

export const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const dropdown: Ref<DropdownLinks[]> = ref([
  {
    id: 1,
    name: "Trending Products",
    link: "/#",
  },
  {
    id: 2,
    name: "Best Selling",
    link: "/#",
  },
  {
    id: 3,
    name: "Top Rated",
    link: "/#",
  },
]);

export const eyeglassesLinks = [
  { name: "All Eyeglasses", link: "/eyeglasses" },
  { name: "Women", link: "/eyeglasses/women" },
  { name: "Men", link: "/eyeglasses/men" },
  { name: "Kids", link: "/eyeglasses/kids" },
  { name: "New Arrivals", link: "/eyeglasses/new" },
];

export const sunglassLinks = [
  { name: "All Sunglasses", link: "/eyeglasses" },
  { name: "Women", link: "/eyeglasses/women" },
  { name: "Men", link: "/eyeglasses/men" },
  { name: "Kids", link: "/eyeglasses/kids" },
  { name: "New Arrivals", link: "/eyeglasses/new" },
];

export const getPinataImageUrl = (url: string) => {
  if (!url) return "";
  return `https://salmon-large-lamprey-825.mypinata.cloud/ipfs/${url}?pinataGatewayToken=dKtlHh5-U_lFXiqoWD45ltZpc8XNIBkOndHeDFKwjrt2Gb1cirkHyS5GGIhxdsrQ`;
};

export const getAppwriteGLBURL = (
  endpoint: string,
  projectId: string,
  bucketId: string,
  fileId: string,
  mode: "view" | "download" = "view"
) => {
  if (!endpoint || !projectId || !bucketId || !fileId) return "";
  const base = endpoint.replace(/\/$/, "");
  const action = mode === "download" ? "download" : "view";
  return `${base}/storage/buckets/${bucketId}/files/${fileId}/${action}?project=${projectId}`;
};

export const getAppwriteGLBBlobURL = async (
  endpoint: string,
  projectId: string,
  bucketId: string,
  fileId: string
) => {
  const client = new Client().setEndpoint(endpoint).setProject(projectId);
  const storage = new Storage(client);

  const downloadUrl = storage.getFileDownload(
    bucketId,
    fileId
  ) as unknown as string;

  const res = await fetch(downloadUrl, { credentials: "include" });
  if (!res.ok) throw new Error(`Appwrite download failed: ${res.status}`);

  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

export default { navigation };

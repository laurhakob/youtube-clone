import Image from "next/image";

export default function Home() {
  return (
    <div>
      <Image src="/logo.svg" alt="logo" width={50} height={50} />
      <p className="text-xl font-semibold tracking-tight">NewTube</p>
    </div>
  );
}

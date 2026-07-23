import type { Metadata } from "next";
import { Noto_Sans_SC, Space_Grotesk } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_SC({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://news.rickyyao.cc"),
  title: "Ricky 热点雷达｜每天正在发生的事",
  description: "聚合中文热榜、科技社区与财经媒体，快速发现正在升温的话题。",
  openGraph: {
    title: "Ricky 热点雷达",
    description: "少刷一点，看见正在发生的事。",
    type: "website",
    locale: "zh_CN",
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1536,
        height: 1024,
        alt: "Ricky 热点雷达 — 少刷一点，看见正在发生的事。",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ricky 热点雷达",
    description: "少刷一点，看见正在发生的事。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${notoSans.variable} ${spaceGrotesk.variable}`}>
        {children}
      </body>
    </html>
  );
}

import { Inter, Noto_Sans_TC } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata = {
  title: "IELTS TOOLS",
  description: "點選範文後直接逐句背誦比對",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant" className={`${inter.variable} ${notoSansTC.variable}`}>
      <body>{children}</body>
    </html>
  );
}

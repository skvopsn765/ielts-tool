import "./globals.css";

export const metadata = {
  title: "IELTS TOOLS",
  description: "點選範文後直接逐句背誦比對",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}

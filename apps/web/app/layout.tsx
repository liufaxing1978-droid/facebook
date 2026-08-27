import type { ReactNode } from "react";

export const metadata = {
  title: "XST Meta",
  description: "兴善堂 Facebook / Meta 智能推广系统"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-Hans">
      <body>{children}</body>
    </html>
  );
}

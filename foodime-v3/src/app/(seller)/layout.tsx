import { SellerNav } from '@/components/common/bottom-nav';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      {children}
      <SellerNav />
    </div>
  );
}

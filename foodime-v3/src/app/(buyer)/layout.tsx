import { BuyerNav } from '@/components/common/bottom-nav';

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20">
      {children}
      <BuyerNav />
    </div>
  );
}

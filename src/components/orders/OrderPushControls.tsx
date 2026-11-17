import PushControls from '@/components/PushControls';
export default function OrderPushControls({ userId }: { userId: string }) { return <PushControls userId={userId} topic="orders" />; }

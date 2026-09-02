import BookingDetailPage from './BookingClient';

export async function generateStaticParams() {
  return [{ id: 'demo' }];
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <BookingDetailPage params={params} />;
}

'use client';

import { useParams } from 'next/navigation';
import AdminEventForm from '../../../../../components/dashboard/admin/AdminEventForm';
import '../../../../../components/dashboard/admin/AdminEventForm.css';

export default function EditEventPage() {
  const params = useParams();
  const eventId = params.id;

  if (!eventId) {
    return <div>Error: ID de evento no válido</div>;
  }

  return <AdminEventForm eventId={eventId} />;
}

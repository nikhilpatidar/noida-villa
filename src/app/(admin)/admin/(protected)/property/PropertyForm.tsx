'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea, Select, FieldError } from '@/components/ui/Input';
import { updatePropertyAction } from './actions';

type Prop = {
  id: string;
  name: string;
  tagline: string;
  shortSummary: string;
  description: string;
  city: string;
  state: string;
  country: string;
  addressLine: string;
  postalCode: string;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  maxGuests: number | null;
  airbnbUrl: string;
  contactEmail: string;
  contactPhone: string;
  whatsappPhone: string;
  instagramUrl: string;
  facebookUrl: string;
  status: 'PREPARING' | 'COMING_SOON' | 'LIVE' | 'TEMPORARILY_UNAVAILABLE';
};

export function PropertyForm({ property }: { property: Prop }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  function onSubmit(fd: FormData) {
    setError(null); setSuccess(null);
    const data: any = { id: property.id };
    for (const k of ['name', 'tagline', 'shortSummary', 'description', 'city', 'state', 'country', 'addressLine', 'postalCode', 'airbnbUrl', 'contactEmail', 'contactPhone', 'whatsappPhone', 'instagramUrl', 'facebookUrl', 'status']) {
      data[k] = String(fd.get(k) ?? '');
    }
    for (const k of ['bedrooms', 'beds', 'bathrooms', 'maxGuests']) {
      const v = String(fd.get(k) ?? '').trim();
      if (v) data[k] = Number(v);
    }
    startTransition(async () => {
      const res = await updatePropertyAction(data);
      if (!res.ok) setError(res.error ?? 'Failed');
      else setSuccess('Saved.');
    });
  }
  return (
    <form action={onSubmit} className="admin-panel p-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div><Label>Name</Label><Input name="name" defaultValue={property.name} required /></div>
        <div><Label>Status</Label>
          <Select name="status" defaultValue={property.status}>
            <option value="PREPARING">Preparing</option>
            <option value="COMING_SOON">Coming Soon</option>
            <option value="LIVE">Live</option>
            <option value="TEMPORARILY_UNAVAILABLE">Temporarily Unavailable</option>
          </Select>
        </div>
        <div className="md:col-span-2"><Label>Tagline</Label><Input name="tagline" defaultValue={property.tagline} /></div>
        <div className="md:col-span-2"><Label>Short summary (≤500)</Label><Textarea name="shortSummary" defaultValue={property.shortSummary} maxLength={500} /></div>
        <div className="md:col-span-2"><Label>Description</Label><Textarea name="description" defaultValue={property.description} className="min-h-[200px]" /></div>
        <div><Label>City</Label><Input name="city" defaultValue={property.city} required /></div>
        <div><Label>State</Label><Input name="state" defaultValue={property.state} required /></div>
        <div><Label>Country</Label><Input name="country" defaultValue={property.country} required /></div>
        <div><Label>Postal code</Label><Input name="postalCode" defaultValue={property.postalCode} /></div>
        <div className="md:col-span-2"><Label>Address line</Label><Input name="addressLine" defaultValue={property.addressLine} /></div>
        <div><Label>Bedrooms</Label><Input name="bedrooms" type="number" min={0} max={50} defaultValue={property.bedrooms ?? ''} /></div>
        <div><Label>Beds</Label><Input name="beds" type="number" min={0} max={100} defaultValue={property.beds ?? ''} /></div>
        <div><Label>Bathrooms</Label><Input name="bathrooms" type="number" min={0} step="0.5" defaultValue={property.bathrooms ?? ''} /></div>
        <div><Label>Max guests</Label><Input name="maxGuests" type="number" min={0} max={100} defaultValue={property.maxGuests ?? ''} /></div>
        <div className="md:col-span-2"><Label>Airbnb URL</Label><Input name="airbnbUrl" defaultValue={property.airbnbUrl} placeholder="https://www.airbnb.com/rooms/..." /></div>
        <div><Label>Contact email</Label><Input name="contactEmail" type="email" defaultValue={property.contactEmail} /></div>
        <div><Label>Contact phone</Label><Input name="contactPhone" defaultValue={property.contactPhone} /></div>
        <div><Label>WhatsApp</Label><Input name="whatsappPhone" defaultValue={property.whatsappPhone} /></div>
        <div><Label>Instagram URL</Label><Input name="instagramUrl" defaultValue={property.instagramUrl} /></div>
        <div><Label>Facebook URL</Label><Input name="facebookUrl" defaultValue={property.facebookUrl} /></div>
      </div>
      <FieldError>{error ?? undefined}</FieldError>
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}
      <Button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Save property'}</Button>
    </form>
  );
}
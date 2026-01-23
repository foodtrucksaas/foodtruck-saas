import { useEffect, useState, useCallback } from 'react';
import type { Campaign, CampaignTargeting, CampaignChannel, Location } from '@foodtruck/shared';
import { supabase } from '../../lib/supabase';
import { useFoodtruck } from '../../contexts/FoodtruckContext';

export type SegmentType = 'all' | 'location' | 'inactive' | 'loyal' | 'new';

export interface CampaignForm {
  name: string;
  channel: CampaignChannel;
  segment: SegmentType;
  locationId: string;
  inactiveDays: number;
  emailSubject: string;
  emailBody: string;
  smsBody: string;
}

const INITIAL_FORM: CampaignForm = {
  name: '',
  channel: 'email',
  segment: 'all',
  locationId: '',
  inactiveDays: 30,
  emailSubject: '',
  emailBody: '',
  smsBody: '',
};

export function useCampaigns() {
  const { foodtruck } = useFoodtruck();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [form, setForm] = useState<CampaignForm>(INITIAL_FORM);

  const fetchData = useCallback(async () => {
    if (!foodtruck) return;
    setLoading(true);

    const [campaignsRes, locationsRes] = await Promise.all([
      supabase
        .from('campaigns')
        .select('*')
        .eq('foodtruck_id', foodtruck.id)
        .order('created_at', { ascending: false }),
      supabase.from('locations').select('*').eq('foodtruck_id', foodtruck.id).order('name'),
    ]);

    if (campaignsRes.data) setCampaigns(campaignsRes.data as unknown as Campaign[]);
    if (locationsRes.data) setLocations(locationsRes.data);

    setLoading(false);
  }, [foodtruck]);

  useEffect(() => {
    if (!foodtruck) return;
    fetchData();
  }, [foodtruck, fetchData]);

  // Fetch recipient count when targeting changes
  useEffect(() => {
    if (!foodtruck || !showModal) return;

    async function fetchCount() {
      const targeting = buildTargeting(form);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await supabase.rpc('count_campaign_recipients', {
        p_foodtruck_id: foodtruck!.id,
        p_targeting: targeting as any,
      });
      setRecipientCount(data ?? 0);
    }

    fetchCount();
  }, [foodtruck, showModal, form.segment, form.locationId, form.inactiveDays]);

  const openNewCampaign = useCallback(() => {
    setEditingCampaign(null);
    setForm({
      ...INITIAL_FORM,
      locationId: locations[0]?.id || '',
    });
    setShowModal(true);
  }, [locations]);

  const openEditCampaign = useCallback((campaign: Campaign) => {
    setEditingCampaign(campaign);
    const targeting = campaign.targeting as CampaignTargeting;
    setForm({
      name: campaign.name,
      channel: campaign.channel,
      segment: targeting.segment as SegmentType,
      locationId: targeting.location_id || locations[0]?.id || '',
      inactiveDays: targeting.days || 30,
      emailSubject: campaign.email_subject || '',
      emailBody: campaign.email_body || '',
      smsBody: campaign.sms_body || '',
    });
    setShowModal(true);
  }, [locations]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingCampaign(null);
    setForm(INITIAL_FORM);
  }, []);

  const saveCampaign = useCallback(async () => {
    if (!foodtruck) return;

    if (!form.name.trim()) {
      console.error('Validation error: campaign name is required');
      return;
    }

    if ((form.channel === 'email' || form.channel === 'both') && !form.emailSubject) {
      console.error('Validation error: email subject is required');
      return;
    }

    if ((form.channel === 'email' || form.channel === 'both') && !form.emailBody) {
      console.error('Validation error: email body is required');
      return;
    }

    if ((form.channel === 'sms' || form.channel === 'both') && !form.smsBody) {
      console.error('Validation error: SMS body is required');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const campaignData: any = {
      foodtruck_id: foodtruck.id,
      name: form.name.trim(),
      type: 'manual',
      trigger_type: 'manual',
      channel: form.channel,
      status: 'draft',
      targeting: buildTargeting(form),
      email_subject: form.emailSubject || null,
      email_body: form.emailBody || null,
      sms_body: form.smsBody || null,
      recipients_count: recipientCount || 0,
    };

    if (editingCampaign) {
      const { error } = await supabase
        .from('campaigns')
        .update(campaignData)
        .eq('id', editingCampaign.id);

      if (error) {
        console.error('Error updating campaign:', error);
        return;
      }
    } else {
      const { error } = await supabase.from('campaigns').insert(campaignData);

      if (error) {
        console.error('Error creating campaign:', error);
        return;
      }
    }

    setShowModal(false);
    fetchData();
  }, [foodtruck, form, editingCampaign, recipientCount, fetchData]);

  const deleteCampaign = useCallback(async (id: string) => {
    if (!confirm('Supprimer cette campagne ?')) return;

    const { error } = await supabase.from('campaigns').delete().eq('id', id);

    if (error) {
      console.error('Error deleting campaign:', error);
      return;
    }

    fetchData();
  }, [fetchData]);

  const sendCampaign = useCallback(async (campaign: Campaign) => {
    if (!confirm(`Envoyer cette campagne à ${campaign.recipients_count} destinataires ?`)) return;

    setSending(campaign.id);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-campaign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ campaign_id: campaign.id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de l'envoi");
      }

      fetchData();
    } catch (error) {
      console.error('Error sending campaign:', error instanceof Error ? error.message : error);
    } finally {
      setSending(null);
    }
  }, [fetchData]);

  return {
    // State
    campaigns,
    locations,
    loading,
    showModal,
    editingCampaign,
    recipientCount,
    sending,
    form,
    setForm,

    // Actions
    openNewCampaign,
    openEditCampaign,
    closeModal,
    saveCampaign,
    deleteCampaign,
    sendCampaign,
  };
}

function buildTargeting(form: CampaignForm): CampaignTargeting {
  switch (form.segment) {
    case 'location':
      return { segment: 'location', location_id: form.locationId };
    case 'inactive':
      return { segment: 'inactive', days: form.inactiveDays };
    case 'loyal':
      return { segment: 'loyal', min_orders: 5 };
    case 'new':
      return { segment: 'new', days: 7 };
    default:
      return { segment: 'all' };
  }
}

export const SEGMENT_OPTIONS: { key: SegmentType; label: string; description: string }[] = [
  { key: 'all', label: 'Tous les clients', description: 'Tous vos clients opt-in' },
  { key: 'location', label: 'Par emplacement', description: "Clients d'un lieu précis" },
  { key: 'inactive', label: 'Clients inactifs', description: 'Pas commandé depuis X jours' },
  { key: 'loyal', label: 'Clients fidèles', description: '5+ commandes passées' },
  { key: 'new', label: 'Nouveaux clients', description: '1ère commande récente' },
];

interface TrialReminder3dParams {
  foodtruckName: string;
  ownerName: string;
  daysRemaining: number;
  billingUrl: string;
}

export function trialReminder3dHtml({
  foodtruckName,
  ownerName,
  daysRemaining,
  billingUrl,
}: TrialReminder3dParams): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6">
  <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif">
    <div style="background:linear-gradient(135deg,#F97316 0%,#EA580C 100%);color:white;padding:40px 30px;text-align:center;border-radius:12px 12px 0 0">
      <h1 style="margin:0;font-size:24px;font-weight:600">Votre essai se termine dans ${daysRemaining} jours</h1>
    </div>
    <div style="background:#ffffff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.05)">
      <p style="font-size:16px;color:#374151;margin:0 0 20px">
        Bonjour <strong>${ownerName}</strong>,
      </p>
      <p style="font-size:16px;color:#374151;margin:0 0 20px">
        Il ne reste plus que <strong>${daysRemaining} jours</strong> avant la fin de votre essai gratuit pour <strong>${foodtruckName}</strong>.
      </p>
      <p style="font-size:16px;color:#374151;margin:0 0 25px">
        Sans carte bancaire enregistrée, vos clients ne pourront plus passer commande via OnMange.app. Vos données seront conservées.
      </p>
      <div style="text-align:center;margin:25px 0">
        <a href="${billingUrl}" style="display:inline-block;background:#F97316;color:white;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none">
          Ajouter ma carte maintenant &rarr;
        </a>
      </div>
      <p style="font-size:14px;color:#6b7280;margin:25px 0 0;text-align:center">
        29&euro; HT/mois &middot; Sans engagement &middot; Annulation en un clic
      </p>
    </div>
    <div style="text-align:center;padding:20px;color:#9ca3af;font-size:12px">
      <p style="margin:0">OnMange.app</p>
    </div>
  </div>
</body>
</html>`;
}

export function trialReminder3dSubject(daysRemaining: number): string {
  return `Plus que ${daysRemaining} jours d'essai — ajoutez votre carte`;
}

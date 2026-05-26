interface TrialReminder7dParams {
  foodtruckName: string;
  ownerName: string;
  daysRemaining: number;
  billingUrl: string;
}

export function trialReminder7dHtml({
  foodtruckName,
  ownerName,
  daysRemaining,
  billingUrl,
}: TrialReminder7dParams): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6">
  <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif">
    <div style="background:linear-gradient(135deg,#3B82F6 0%,#1D4ED8 100%);color:white;padding:40px 30px;text-align:center;border-radius:12px 12px 0 0">
      <h1 style="margin:0;font-size:24px;font-weight:600">Plus que ${daysRemaining} jours d'essai</h1>
    </div>
    <div style="background:#ffffff;padding:30px;border-radius:0 0 12px 12px;box-shadow:0 4px 6px rgba(0,0,0,0.05)">
      <p style="font-size:16px;color:#374151;margin:0 0 20px">
        Bonjour <strong>${ownerName}</strong>,
      </p>
      <p style="font-size:16px;color:#374151;margin:0 0 20px">
        Votre essai gratuit d'<strong>OnMange.app</strong> pour <strong>${foodtruckName}</strong> se termine dans <strong>${daysRemaining} jours</strong>.
      </p>
      <p style="font-size:16px;color:#374151;margin:0 0 25px">
        Pour continuer à recevoir des commandes sans interruption, ajoutez votre carte bancaire dès maintenant :
      </p>
      <div style="text-align:center;margin:25px 0">
        <a href="${billingUrl}" style="display:inline-block;background:#3B82F6;color:white;font-size:16px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none">
          Ajouter ma carte bancaire &rarr;
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

export function trialReminder7dSubject(daysRemaining: number): string {
  return `Plus que ${daysRemaining} jours d'essai OnMange.app`;
}

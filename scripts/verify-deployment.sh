#!/bin/bash

# Verify deployment - checks that JS files are served correctly
# Run after each Vercel deployment

set -e

DOMAIN="${1:-onmange.app}"
ERRORS=0

echo "🔍 Vérification du déploiement sur $DOMAIN..."
echo ""

# Function to check a subdomain
check_subdomain() {
  local subdomain=$1
  local path=$2
  local url="https://${subdomain}.${DOMAIN}${path}"

  echo "📄 Vérification $url"

  # Fetch HTML and extract JS files
  html=$(curl -s "$url")

  if [ -z "$html" ]; then
    echo "   ❌ Impossible de récupérer la page"
    ERRORS=$((ERRORS + 1))
    return
  fi

  # Extract JS file paths from script tags (src="/assets/xxx.js" or src="./assets/xxx.js")
  js_files=$(echo "$html" | grep -oE 'src="[^"]*\.js"' | sed 's/src="//g' | sed 's/"//g' | head -10)

  if [ -z "$js_files" ]; then
    echo "   ⚠️  Aucun fichier JS trouvé dans le HTML"
    return
  fi

  for js_file in $js_files; do
    # Build full URL
    if [[ "$js_file" == http* ]]; then
      js_url="$js_file"
    elif [[ "$js_file" == /* ]]; then
      js_url="https://${subdomain}.${DOMAIN}${js_file}"
    else
      js_url="https://${subdomain}.${DOMAIN}/${js_file#./}"
    fi

    # Check Content-Type header
    content_type=$(curl -sI "$js_url" 2>/dev/null | grep -i "content-type:" | head -1 | tr -d '\r')
    http_status=$(curl -sI "$js_url" 2>/dev/null | head -1 | awk '{print $2}')

    if [[ "$http_status" != "200" ]]; then
      echo "   ❌ $js_file -> HTTP $http_status"
      ERRORS=$((ERRORS + 1))
    elif [[ "$content_type" == *"javascript"* ]] || [[ "$content_type" == *"application/javascript"* ]]; then
      echo "   ✅ $js_file -> OK"
    elif [[ "$content_type" == *"text/html"* ]]; then
      echo "   ❌ $js_file -> MIME ERROR (text/html au lieu de javascript)"
      ERRORS=$((ERRORS + 1))
    else
      echo "   ⚠️  $js_file -> $content_type"
    fi
  done

  echo ""
}

# Check main domains
check_subdomain "www" "/"
check_subdomain "pro" "/dashboard/"

# Check client app (via direct path since we need a valid foodtruck slug)
echo "📄 Vérification client app (via www.onmange.app/client/)"
client_html=$(curl -s "https://www.${DOMAIN}/client/")
client_js=$(echo "$client_html" | grep -oE 'src="[^"]*\.js"' | sed 's/src="//g' | sed 's/"//g' | head -5)

for js_file in $client_js; do
  if [[ "$js_file" == /* ]]; then
    js_url="https://www.${DOMAIN}${js_file}"
  else
    js_url="https://www.${DOMAIN}/client/${js_file#./}"
  fi

  content_type=$(curl -sI "$js_url" 2>/dev/null | grep -i "content-type:" | head -1 | tr -d '\r')
  http_status=$(curl -sI "$js_url" 2>/dev/null | head -1 | awk '{print $2}')

  if [[ "$http_status" != "200" ]]; then
    echo "   ❌ $js_file -> HTTP $http_status"
    ERRORS=$((ERRORS + 1))
  elif [[ "$content_type" == *"javascript"* ]]; then
    echo "   ✅ $js_file -> OK"
  elif [[ "$content_type" == *"text/html"* ]]; then
    echo "   ❌ $js_file -> MIME ERROR"
    ERRORS=$((ERRORS + 1))
  else
    echo "   ⚠️  $js_file -> $content_type"
  fi
done
echo ""

# Summary
echo "================================"
if [ $ERRORS -eq 0 ]; then
  echo "✅ Déploiement OK - Tous les fichiers JS sont servis correctement"
  exit 0
else
  echo "❌ $ERRORS erreur(s) détectée(s)"
  echo ""
  echo "Solutions possibles :"
  echo "  1. Attendre 1-2 minutes (propagation CDN)"
  echo "  2. Forcer un redéploiement : git commit --allow-empty -m 'chore: force redeploy' && git push"
  echo "  3. Vérifier la config Vercel"
  exit 1
fi

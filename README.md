# Gecodis CRM

CRM B2B nouvelle génération, assisté par IA, pour une entreprise de **logistique, transport, immobilier logistique et prestations de services**. Objectif : devenir l'outil central de l'entreprise — connaître chaque prospect, suivre toute la relation commerciale, mesurer la rentabilité de chaque client, et automatiser la recherche d'informations.

Design premium inspiré HubSpot / Salesforce / Monday / Linear — mode sombre, Kanban drag & drop, recherche instantanée, IA présente sur toutes les pages.

## Stack technique

| Couche | Techno |
|---|---|
| Backend | NestJS (TypeScript) |
| Frontend | Next.js 14 (App Router) + React + TypeScript + Tailwind |
| Base de données | PostgreSQL |
| ORM | Prisma |
| Auth | JWT (access + refresh) + MFA TOTP (otplib) + OAuth Google (avec liaison explicite à un compte existant) — auth séparée pour le portail client |
| Tests | Jest (unitaire) + Jest/Supertest (e2e, base PostgreSQL réelle) |
| IA | OpenAI API, avec repli heuristique déterministe si pas de clé |
| Files d'attente | Redis + BullMQ |
| Emails | Adaptateur console / Resend / SendGrid / SMTP |
| Recherche | PostgreSQL full-text (par défaut) ou Elasticsearch (`SEARCH_PROVIDER=elasticsearch`) |
| PDF | Génération native (pdfkit) — devis, factures, listes, classements |
| Monorepo | npm workspaces (`apps/api`, `apps/web`, `packages/shared`) |

## Démarrage rapide

```bash
cp .env.example .env
cp .env.example apps/api/.env   # NestJS lit son .env depuis apps/api/

docker compose up -d postgres redis   # + `--profile search` pour Elasticsearch

npm install
npm run prisma:migrate --workspace=apps/api
npm run prisma:seed --workspace=apps/api
npm run dev
```

- API : http://localhost:4000/api — Swagger : http://localhost:4000/api/docs
- Web (staff) : http://localhost:3000 — connexion démo : **demo@gecodis.fr / Demo1234!**
- Portail client : http://localhost:3000/portal/login — connexion démo : **client@freshlogistique.fr / Client1234!**

Sans aucune clé API externe, l'application est **entièrement fonctionnelle en mode démo** : enrichissement, scoring IA, assistant commercial et emailing utilisent des implémentations de repli déterministes documentées dans `.env.example`.

## Modules livrés

1. **Entreprises** — fiche complète (légal, financier, IA), enrichissement automatique multi-source, immobilier détecté par IA avec score de confiance.
2. **Contacts** — classification automatique du poste/pouvoir de décision, anniversaires.
3. **Prospection / Pipeline** — Kanban drag & drop, 9 étapes (`Prospect froid` → `Gagné/Perdu`), historique par étape (date, commentaire, compte rendu, prochaine action), rappels automatiques.
4. **Activités** — appels, emails, visites, RDV, tâches, avec compte rendu et durée.
5. **Devis** — versioning, signature électronique (mock, adaptateurs DocuSign/Yousign prêts), transformation automatique en client.
6. **Factures** — import PDF avec extraction automatique (montant HT/TVA/TTC, dates).
7. **Rentabilité client** — CA, coûts (transport/stockage/préparation/SAV/palettes/manutention), marge €/%, notation automatique, classements (Top CA / Top marge / Top perte).
8. **Campagnes emailing** — templates, variables, segmentation, envoi, suivi ouverture/clic/désinscription.
9. **IA commerciale** — assistant conversationnel répondant aux questions opérationnelles ("Qui dois-je appeler aujourd'hui ?", "Quels clients perdent de l'argent ?", etc.), widget flottant sur toutes les pages + page dédiée.
10. **Tableaux de bord** — KPIs, pipeline, prévisionnel, top commerciaux, activité quotidienne.
11. **Automatisations** — relances, rappels, alertes "non relancé depuis 30 jours", recalcul nocturne de la rentabilité (BullMQ + `@nestjs/schedule`).
12. **Recherche intelligente** — recherche globale multi-critères (activité, ville, NAF, CA, effectif, besoins, immobilier…).
13. **Import / Export** — CSV en masse (compatible Excel), export à la demande.
14. **Immobilier logistique** — module "Opportunités immobilières" (location/vente) avec matching automatique des prospects intéressés.
15. **Contrats** — suivi des contrats clients, échéances, alertes de renouvellement.
16. **Portail client** — espace self-service séparé (`/portal`) : le client consulte ses devis (et les signe électroniquement), ses factures, ses contrats et le suivi de ses dossiers. Comptes gérés par le staff depuis l'onglet « Portail client » de chaque fiche entreprise.
17. **Connecteurs ERP / facturation / WMS** — webhooks sortants signés HMAC (création client, devis signé, opportunité gagnée) et entrants (facture payée/créée côté facturation, alerte stock/expédition côté WMS), avec journal d'audit complet (`GET /api/webhooks/logs`).
18. **Export PDF natif** — entreprises, devis, factures et classements de rentabilité, générés nativement (pdfkit, aucune dépendance navigateur).
19. **Recherche Elasticsearch** — bascule optionnelle (`SEARCH_PROVIDER=elasticsearch`) avec indexation automatique et repli transparent vers PostgreSQL si le nœud est indisponible.
20. **OAuth Google** — connexion staff via Google, en plus de l'email/mot de passe, avec liaison automatique (email déjà connu, vérifié par Google) et liaison explicite depuis `/settings` (« Lier mon compte Google ») pour un compte déjà authentifié.
21. **Enrichissement LinkedIn** — via une API tierce conforme (type Proxycurl), en plus d'INSEE/Pappers/Google Places.
22. **Sauvegardes** — export complet de la base (hebdomadaire automatique + à la demande + snapshot juste avant chaque migration structurelle), stockage local + S3 optionnel, restauration en un clic depuis `/settings` (réservé ADMIN).
23. **Canal de contact & engagement mailing** — chaque activité enregistre le canal utilisé (Appel/Email/**WhatsApp**/Visite/RDV…) ; chaque contact affiche ses statistiques d'ouverture d'emails de campagne, avec une vue dédiée « Contacts engagés » (`/contacts` → onglet) pour prioriser l'appel des contacts qui lisent leurs emails.
24. **Chasse commerciale** — recherche manuelle (jamais automatique) de nouveaux prospects par secteur/métier via INSEE Sirene/Pappers, avec icône de secteur, aperçu des besoins logistiques et détection heuristique « logistique interne vs sous-traitée » (avec nom du sous-traitant si identifiable) ; import en un clic vers une fiche entreprise complète.

## IA — comment ça marche sans clé OpenAI

Chaque service IA (`apps/api/src/ai/`) suit le même principe : une heuristique déterministe et explicable (codes NAF, mots-clés, effectif, CA) sert de base ; si `OPENAI_API_KEY` est configurée, le résultat est affiné/moyenné avec un appel `gpt-4.1` en JSON strict. Voir `heuristics.ts` pour la logique de scoring des besoins (transport/logistique/stockage/affrètement/fulfillment/entrepôt), du potentiel commercial, de la priorité, de l'immobilier et du rôle décisionnaire des contacts.

## Enrichissement automatique

`apps/api/src/enrichment/providers/` implémente une interface commune `CompanyDataProvider` pour INSEE Sirene, Pappers, Google Places et LinkedIn (via une API tierce conforme type Proxycurl — LinkedIn n'expose pas d'API publique de lookup société, et le scraping direct du site viole ses CGU) — chacun s'active automatiquement dès qu'une clé API est renseignée dans `.env`, sans changement de code. Un provider de repli (`demo-fallback.provider.ts`) garantit un résultat même sans aucune clé. Les appels sont mis en file (BullMQ) dès la création d'une entreprise ; en l'absence de Redis, l'enrichissement bascule automatiquement en exécution synchrone.

## Portail client

`apps/api/src/portal/` — identité et JWT (`PORTAL_JWT_SECRET`) entièrement séparés des comptes staff : un jeton portail ne peut authentifier aucune route interne, et réciproquement (vérifié par test). Le staff invite un client depuis l'onglet « Portail client » d'une fiche entreprise (`POST /api/companies/:id/portal-users`) ; le client se connecte sur `/portal/login` et n'accède qu'aux données de sa propre entreprise (devis avec signature électronique, factures, contrats, suivi des opportunités en langage client).

## Connecteurs ERP / facturation / WMS

`apps/api/src/webhooks/` — sortant : `WebhookDispatcherService.dispatch()` met en file (BullMQ, retry exponentiel) un événement signé HMAC-SHA256 vers `BILLING_SOFTWARE_WEBHOOK_URL` / `WMS_WEBHOOK_URL` (`company.created`, `quote.signed`, `deal.won`). Entrant : `POST /api/webhooks/billing` et `POST /api/webhooks/wms`, signature vérifiée sur les octets bruts de la requête (`invoice.paid`/`invoice.created` mettent à jour les factures, `warehouse.threshold_alert`/`shipment.completed` créent tâche/activité). Chaque échange est journalisé dans `ConnectorEventLog`, consultable via `GET /api/webhooks/logs`.

## Liaison de compte Google

`apps/api/src/auth/` gère trois cas, dans cet ordre (voir `AuthService.loginWithGoogle`) :

1. **Compte déjà lié** (`googleId` connu) → connexion directe.
2. **Email Google déjà utilisé par un compte email/mot de passe existant** → liaison automatique (Google ayant vérifié l'email, c'est sans risque) puis connexion.
3. **Aucune correspondance** → création d'un nouveau compte.

Un quatrième cas permet à un utilisateur **déjà connecté** de lier explicitement son compte Google sans dépendre d'une correspondance d'email : il clique « Lier mon compte Google » sur `/settings`, ce qui appelle `POST /auth/google/link-ticket` (authentifié) pour obtenir un jeton à usage unique et durée de vie courte (5 min), relayé à Google via le paramètre `state` de l'OAuth (`GoogleLinkTicketService`, en mémoire — à remplacer par Redis pour un déploiement multi-instance). Un compte Google ne peut jamais être lié à deux comptes Gecodis à la fois.

## Sauvegardes & restauration

`apps/api/src/backup/` — `BackupService` exporte l'intégralité de la base via Prisma (ordre des modèles calculé par tri topologique sur le DMMF, pour respecter les contraintes de clé étrangère à la restauration), compresse en gzip, et stocke en local + sur S3 si `S3_ACCESS_KEY_ID`/`S3_SECRET_ACCESS_KEY` sont configurées (indispensable sur un PaaS dont le disque est éphémère entre deux déploiements). Trois déclencheurs :

- **Hebdomadaire** — tous les dimanches 3h (`@Cron`).
- **Manuel** — bouton « Sauvegarder maintenant » dans `/settings` (réservé ADMIN).
- **Pré-migration** — `apps/api/src/backup/pre-migration-snapshot.script.ts`, exécuté automatiquement juste avant `prisma migrate deploy` dans la chaîne de déploiement (`npm run start:api`). Ce script dump en SQL brut (pas via le client Prisma typé, qui reflète déjà le *nouveau* schéma alors que la base a encore l'*ancien*) — voir les commentaires du fichier.

Restauration : `POST /api/backups/:id/restore` (ADMIN, confirmation explicite requise) — remplace toutes les tables sauvegardées par le contenu de l'archive, dans le bon ordre. C'est le filet de sécurité demandé : si une mise à jour structurelle pose problème, on revient à la sauvegarde prise juste avant.

## Canal de contact & engagement mailing

Chaque `Activity` porte un `type` (`APPEL`/`EMAIL`/`WHATSAPP`/`VISITE`/`RDV`/…) — formulaire « Ajouter une activité » sur la fiche entreprise. Chaque `CampaignRecipient` trace `sentAt`/`openedAt`/`clickedAt` par contact (pixel de suivi déjà en place, voir § Campagnes) ; `ContactsService.mailingEngagement()` agrège ces données par contact (affiché sur sa fiche) et `GET /api/contacts/engaged` classe les contacts qui ouvrent effectivement leurs emails — exposé dans `/contacts` sous l'onglet « Contacts engagés », avec lien d'appel direct, pour prioriser le téléphone sur l'email quand ça marche mieux.

## Chasse commerciale

`apps/api/src/prospecting/` — recherche **manuelle uniquement** (aucun cron, aucun déclenchement automatique, pour ne pas consommer inutilement le quota des API tierces) par code NAF/secteur et localisation, via INSEE Sirene ou Pappers (recherche par critères, pas juste par SIREN comme l'enrichissement classique) ; repli sur un jeu de données de démonstration clairement identifié si aucune clé n'est configurée. Chaque résultat affiche une icône de secteur (`sectorTagForNaf`, pictogrammes génériques — jamais de vrai logo de marque), un aperçu des besoins logistiques (mêmes heuristiques que le scoring des entreprises) et une détection best-effort « logistique interne / sous-traitée » (`inferLogisticsMode`, avec reconnaissance des principaux prestataires 3PL français/européens si nommés dans le texte). Un clic « Importer » crée la fiche entreprise et déclenche le pipeline d'enrichissement/scoring normal ; les imports sont dé-dupliqués par SIREN.

## Tests automatisés

```bash
# Unitaires — heuristiques IA, signature de webhook, services (Prisma mocké). Aucune base requise.
npm run test --workspace=apps/api

# End-to-end — auth, portail client, webhooks. Nécessite une base PostgreSQL
# dédiée (gecodis_crm_test) ; les migrations sont appliquées automatiquement
# au lancement (voir test/global-setup.ts).
createdb gecodis_crm_test   # une seule fois
npm run test:e2e --workspace=apps/api
```

- **89 tests unitaires** (`src/**/*.spec.ts`) : scoring IA (besoins/potentiel/priorité/immobilier/rôle des contacts/logistique interne-sous-traitée), signature HMAC (payload et corps brut), calcul de rentabilité et notation, transitions du pipeline (webhook `deal.won` déclenché une seule fois, rappels automatiques), logique de liaison de compte Google (les 4 cas ci-dessus), export/restauration de sauvegarde (tri topologique, wipe+reload en ordre FK-safe, round-trip modèle et SQL brut), engagement mailing par contact, recherche/import de la chasse commerciale (repli démo, sélection de fournisseur, dé-duplication).
- **36 tests e2e** (`test/**/*.e2e-spec.ts`, contre une vraie base Postgres) : inscription/connexion/rejet de mot de passe, isolation totale entre jetons staff et portail (vérifiée dans les deux sens), scoping d'un client portail à sa seule entreprise, signature électronique d'un devis, invitation d'un compte portail par le staff, rejet/acceptation de webhook selon la signature HMAC, journalisation dans `ConnectorEventLog`, cycle complet de sauvegarde (déclenchement/liste/téléchargement, restauration protégée par confirmation), recherche et import de prospects.

## Roadmap / limites connues

Ce dépôt livre une base fonctionnelle de bout en bout plutôt qu'une simulation : schéma Prisma, 28+ modules API et pages web sont réels, avec 125 tests automatisés qui passent (89 unitaires + 36 e2e contre une vraie base PostgreSQL — voir § Tests automatisés) en plus des migrations/seed/build validés. Points volontairement laissés en extension pour une v2 :

- **Export Excel natif (.xlsx)** — l'export CSV (déjà compatible Excel) et l'export PDF sont complets ; un export `.xlsx` avec mise en forme reste à ajouter.
- **Connecteurs ERP/WMS** — le contrat webhook (signature, événements, journal) est fonctionnel des deux côtés, mais n'a été testé qu'en simulant l'appel HTTP ; l'intégration avec un logiciel de facturation ou un WMS réel nécessitera d'adapter le format d'événement à celui de l'outil choisi.
- **Elasticsearch** — le provider (indexation + recherche + repli automatique) est implémenté et compile, mais n'a pas pu être testé contre un nœud ES réel dans cet environnement (le mode par défaut, PostgreSQL, est lui pleinement validé).
- **Signature électronique** — le flux (devis → signature → transformation en client, accessible côté CRM comme côté portail) est fonctionnel de bout en bout, mais avec un fournisseur *mock* (`QuotesService.sign()`) ; brancher DocuSign/Yousign consiste à remplacer cette méthode par un appel à leur API sans changer le reste du flux.

## Structure du repo

```
apps/
  api/
    src/      NestJS — API REST (Swagger sur /api/docs), tests unitaires en *.spec.ts à côté du code
    test/     Tests e2e (*.e2e-spec.ts) + bootstrap/config Jest dédiés
  web/        Next.js — application web
packages/
  shared/     Enums & types partagés (pipeline, scoring, rôles…)
docker-compose.yml   Postgres, Redis, Elasticsearch (optionnel), Mailhog (dev)
```

## Tests effectués

- `tsc --noEmit` et `nest build` : ✅ sans erreur sur l'API.
- `next build` : ✅ sans erreur sur le web (25 routes générées, staff + portail + paramètres + chasse commerciale).
- **89 tests unitaires + 36 tests e2e : ✅ tous verts**, exécutés réellement (pas seulement écrits) — voir § Tests automatisés.
- Migrations Prisma + seed exécutés sur une base PostgreSQL réelle : ✅.
- API démarrée et testée en conditions réelles (au-delà des tests automatisés, en plus des questions d'assistant IA de l'énoncé) :
  - export PDF (entreprises, devis, classement de rentabilité) — fichiers PDF valides générés et vérifiés ;
  - recherche : repli PostgreSQL fonctionnel, endpoint de réindexation Elasticsearch testé (no-op hors mode ES, comme attendu) ;
  - invitation d'un compte portail par le staff avec vérification que le hash du mot de passe n'est jamais renvoyé par l'API (faille détectée et corrigée pendant la validation) ;
  - sauvegarde/restauration exécutée en conditions réelles contre PostgreSQL (script pré-migration lancé manuellement, archive relue, `BackupRecord` vérifié en base) ;
  - fiabilisé au passage : `CompaniesService.triggerEnrichment()` pouvait rester bloqué indéfiniment si Redis était injoignable (retry infini d'ioredis) au lieu de basculer sur le repli synchrone documenté — désormais borné par un timeout.

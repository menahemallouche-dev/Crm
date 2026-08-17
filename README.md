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
| Auth | JWT (access + refresh) + MFA TOTP (otplib) — OAuth Google scaffolded |
| IA | OpenAI API, avec repli heuristique déterministe si pas de clé |
| Files d'attente | Redis + BullMQ |
| Emails | Adaptateur console / Resend / SendGrid / SMTP |
| Recherche | PostgreSQL full-text (par défaut) — extension Elasticsearch documentée |
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
- Web : http://localhost:3000
- Connexion démo (créée par le seed) : **demo@gecodis.fr / Demo1234!**

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

## IA — comment ça marche sans clé OpenAI

Chaque service IA (`apps/api/src/ai/`) suit le même principe : une heuristique déterministe et explicable (codes NAF, mots-clés, effectif, CA) sert de base ; si `OPENAI_API_KEY` est configurée, le résultat est affiné/moyenné avec un appel `gpt-4.1` en JSON strict. Voir `heuristics.ts` pour la logique de scoring des besoins (transport/logistique/stockage/affrètement/fulfillment/entrepôt), du potentiel commercial, de la priorité, de l'immobilier et du rôle décisionnaire des contacts.

## Enrichissement automatique

`apps/api/src/enrichment/providers/` implémente une interface commune `CompanyDataProvider` pour INSEE Sirene, Pappers et Google Places — chacun s'active automatiquement dès qu'une clé API est renseignée dans `.env`, sans changement de code. Un provider de repli (`demo-fallback.provider.ts`) garantit un résultat même sans aucune clé. Les appels sont mis en file (BullMQ) dès la création d'une entreprise ; en l'absence de Redis, l'enrichissement bascule automatiquement en exécution synchrone.

## Roadmap / limites connues

Ce dépôt livre une base solide et fonctionnelle de bout en bout plutôt qu'une simulation : le schéma Prisma, les 20+ modules API et les pages web ci-dessus sont réels et testés (migration + seed + build validés). Les points suivants sont volontairement laissés en extension pour une v2 :

- **Portail client** (accès self-service pour les clients : devis, factures, suivi) — non démarré.
- **Connecteurs ERP / logiciel de facturation / WMS** — points d'entrée prévus dans `.env.example` (`BILLING_SOFTWARE_WEBHOOK_URL`, `WMS_WEBHOOK_URL`) mais webhooks non implémentés.
- **Recherche Elasticsearch** — `docker-compose.yml` provisionne le nœud (`--profile search`) et `SEARCH_PROVIDER` est lu, mais le provider ES lui-même n'est pas encore codé (repli PostgreSQL pleinement fonctionnel).
- **Export PDF / Excel natif** — l'export CSV (compatible Excel) est complet ; un export PDF dédié reste à ajouter.
- **OAuth Google / MFA** — JWT + TOTP (MFA) sont fonctionnels ; le flux OAuth Google est configuré côté variables d'environnement mais le callback n'est pas encore branché.
- **LinkedIn / réseaux sociaux** — l'enrichissement LinkedIn nécessite un fournisseur tiers (scraping soumis à conditions d'utilisation) ; la clé est prévue (`LINKEDIN_SCRAPER_API_KEY`) mais aucun provider n'est branché par défaut.

## Structure du repo

```
apps/
  api/      NestJS — API REST (Swagger sur /api/docs)
  web/      Next.js — application web
packages/
  shared/   Enums & types partagés (pipeline, scoring, rôles…)
docker-compose.yml   Postgres, Redis, Elasticsearch (optionnel), Mailhog (dev)
```

## Tests effectués

- `tsc --noEmit` et `nest build` : ✅ sans erreur sur l'API.
- `next build` : ✅ sans erreur sur le web (16 routes générées).
- Migration Prisma + seed exécutés sur une base PostgreSQL réelle : ✅.
- API démarrée et testée en conditions réelles (login JWT, dashboard, Kanban, assistant IA sur les 8 questions de l'énoncé, rentabilité, matching immobilier) : ✅.

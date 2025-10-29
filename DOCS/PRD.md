# Legenda Unified Platform Brownfield Enhancement PRD

## Intro Project Analysis and Context

### Existing Project Overview

#### Analysis Source
User-provided information (`brownfield-architecture.md`)

#### Current Project State
הפרויקט הנוכחי מורכב משתי אפליקציות נפרדות (AuditsApp ו-ScheduleApp) הפועלות בסביבת Production. המטרה היא לאחד אותן לפלטפורמה אחת ("Legenda") עם ניהול משתמשים מרכזי (Auth0), חווית משתמש אחידה, ובסיס טכנולוגי מודרני (Monorepo ו-Next.js).

### Available Documentation Analysis
אנו משתמשים בניתוח הפרויקט הקיים כפי שתואר בקובץ `brownfield-architecture.md`.

#### Available Documentation
- [x] Tech Stack Documentation (קיים בסעיף 3 בארכיטקטורה)
- [x] Source Tree/Architecture (קיים בסעיפים 5 ו-7 בארכיטקטורה)
- [x] Coding Standards (קיים בסעיף 9 בארכיטקטורה)
- [x] API Documentation (קיים חלקית בסעיפים 5 ו-6 בארכיטקטורה)
- [x] External API Documentation (קיים בסעיף 6 בארכיטקטורה)
- [ ] UX/UI Guidelines (מלבד ציון MUI/Tailwind, חסר מסמך UI/UX Spec)
- [x] Technical Debt Documentation (מוזכר ב"Key Challenges Addressed" בארכיטקטורה)
- [ ] "Other: ___"

### Enhancement Scope Definition

#### Enhancement Type
- [x] New Feature Addition (יצירת Shell מרכזי, API Gateway וניהול משתמשים אדמיניסטרטיבי)
- [x] Major Feature Modification (מיגרציה מלאה של ScheduleApp מ-JWT פנימי ל-Auth0)
- [x] Integration with New Systems (אינטגרציה של שתי האפליקציות תחת Shell אחד)
- [ ] Performance/Scalability Improvements
- [ ] UI/UX Overhaul (בשלב זה מדובר באיחוד, לא בשיפוץ מלא)
- [ ] Technology Stack Upgrade (מעבר ל-Monorepo, ובעתיד CRA ל-Next.js)
- [ ] Bug Fix and Stability Improvements
- [ ] "Other: ___"

#### Enhancement Description
איחוד שתי אפליקציות קיימות (AuditsApp ו-ScheduleApp) לפלטפורמה אחת עם חווית משתמש אחידה (Shell משותף). זה כולל מיגרציה של ScheduleApp לשימוש ב-Auth0 לטובת SSO, והקמת API Gateway מרכזי בסביבת Monorepo.

#### Impact Assessment
- [ ] Minimal Impact (isolated additions)
- [ ] Moderate Impact (some existing code changes)
- [x] Significant Impact (substantial existing code changes) (דורש refactor למערכת האימות של ScheduleApp)
- [x] Major Impact (architectural changes required) (הטמעת Monorepo, Shell, ו-API Gateway)

### Goals and Background Context

#### Goals
- ניהול משתמשים מרכזי (AuthN/AuthZ) באמצעות Auth0 ו-SSO.
- חווית משתמש (UI/UX) אחידה עם Shell ניווט משותף ומעבר חלק בין אפליקציות.
- הקמת בסיס טכנולוגי מודרני (Monorepo, Next.js) לאינטגרציה עתידית של אפליקציות נוספות.

#### Background Context
כיום, כל אפליקציה פועלת בנפרד עם מערכות אימות שונות ובסיסי נתונים נפרדים, מה שיוצר חווית משתמש מקוטעת וקושי בניהול. האיחוד נועד לפתור אתגרים אלו, תוך שמירה על יציבות האפליקציות הקיימות ב-Production.

[...]
### Change Log
| Change                     | Date       | Version | Description                                                           | Author      |
| :------------------------- | :--------- | :------ | :-------------------------------------------------------------------- | :---------- |
| Initial Draft              | 27/10/2025 | 0.1     | Initial PRD draft based on architecture doc                           | John (PM)   |
| Tooling Update             | 27/10/2025 | 0.2     | Switched Monorepo tool from pnpm to npm workspaces per user request. | John (PM)   |
| Add Store Persona & FRs    | 28/10/2025 | 0.3     | Added "Store" persona and related FRs based on user clarification.    | John (PM)   |
| Refined Persona Definitions| 28/10/2025 | 0.4     | Updated definitions for all personas per user feedback.               | John (PM)   |

## Requirements

### Functional

1.  **FR1 (Shell):** המערכת תספק Shell (מעטפת) יישום מרכזי (ייבנה כ-`apps/shell` ב-Monorepo).
2.  **FR2 (Shell Nav):** ה-Shell יכלול ניווט עליון ("בסגנון גוגל") שיאפשר מעבר חלק בין האפליקציות המשולבות (AuditsApp, ScheduleApp, ובעתיד נוספות), תוך התאמה להרשאות המשתמש.
3.  **FR3 (AuthN):** המערכת תשתמש ב-Auth0 כשירות האימות (AuthN) וההרשאות (AuthZ) המרכזי והיחיד עבור *כל* סוגי המשתמשים (Admin, Regional Manager, Manager, Employee, Store).
4.  **FR4 (SSO):** משתמשים (כולל "Store") יתחברו פעם אחת דרך ה-Shell ויקבלו גישה (SSO) לכל האפליקציות/פונקציות להן הם מורשים.
5.  **FR5 (Migration):** מערכת האימות הפנימית של ScheduleApp (מבוססת JWT/bcrypt) תוסר, והאפליקציה (גם ה-Frontend וגם ה-Backend) תותאם לעבודה מלאה מול Auth0.
6.  **FR6 (Migration Users):** משתמשי ScheduleApp קיימים יועברו (migrated) ל-Auth0 וידרשו איפוס סיסמה חד-פעמי.
7.  **FR7 (API Gateway):** יוקם API Gateway מרכזי (`apps/api-gateway`).
8.  **FR8 (Gateway Auth):** ה-API Gateway יהיה הרכיב היחיד שאחראי על אימות (validation) של טוקני Auth0 מה-Frontend.
9.  **FR9 (Gateway Routing):** ה-API Gateway ינתב בקשות ל-Backend המתאים (audits-be או schedule-be) לאחר אימות מוצלח, תוך אכיפת הרשאות ברמת ה-API Gateway.
10. **FR10 (User Sync):** בעת התחברות, המערכת תסנכרן פרטי משתמש בסיסיים מ-Auth0 לבסיסי הנתונים הלוקאליים (MongoDB ו-PostgreSQL) ותיצור משתמש מקומי אם אינו קיים (עבור כל סוגי המשתמשים).
11. **FR11 (User Management UI):** המערכת תספק ממשק ניהול משתמשים מרכזי (בתוך ה-Shell) שיאפשר לאדמינים ולמנהלים ליצור ולנהל את כל סוגי המשתמשים (Admin, Regional Manager, Manager, Employee, **Store**) בהתאם להרשאותיהם.
12. **FR12 (User Creation Flow):** יצירת משתמש חדש בממשק הניהול תיצור את המשתמש ב-Auth0 (ללא סיסמה עבור משתמשים רגילים, או עם סיסמה ראשונית עבור "Store") ותשלח לו הזמנה במייל (למשתמשים רגילים) להגדרת סיסמה.
13. **FR13 (Store View):** המערכת תאפשר למשתמש מסוג "Store" להתחבר (באמצעות Auth0) ולצפות בביקורות (Audits) ובמשימות שהוגדרו עבור החנות הספציפית שלו דרך `audits-be`.
14. **FR14 (Store Checklist Fill):** המערכת תאפשר למשתמש מסוג "Store" למלא צ'קליסטים שהוכנו עבור החנות דרך `audits-be`.
15. **FR15 (Manager Checklist Prep):** המערכת תאפשר למשתמש מסוג "Manager (Store level)" להכין צ'קליסטים ומשימות עבור החנות/חנויות שלו דרך `audits-be`, שיהיו זמינים למשתמש ה-"Store".
16. **FR16 (Regional Manager Audit Perform):** המערכת תאפשר למשתמש מסוג "Regional Manager" לבצע ביקורות (Audits) בסניפים שתחת אחריותו דרך `audits-be`.
17. **FR17 (Employee Schedule View):** המערכת תאפשר למשתמש מסוג "Employee" לצפות בלוח הזמנים שלו דרך `schedule-be`.
18. **FR18 (Employee Availability):** המערכת תאפשר למשתמש מסוג "Employee" למלא זמינות עתידית בלוח הזמנים דרך `schedule-be`.
*(דרישות עתידיות לגבי ניהול תוכן עבור "Store" (נהלים, מתכונים) אינן כלולות ב-MVP זה)*

### Non Functional

1.  **NFR1 (Phased Rollout):** האיחוד יבוצע בסביבת Staging נפרדת ויעבור ל-Production רק לאחר אישור מלא, תוך שימוש בעדכון DNS לטובת אפשרות Rollback מהיר.
2.  **NFR2 (Stability):** שתי האפליקציות הקיימות (AuditsApp, ScheduleApp) חייבות להישאר יציבות וזמינות בסביבת Production הנוכחית שלהן עד למועד ה-Switchover.
3.  **NFR3 (Monorepo):** כל הקוד החדש (Shell, Gateway) והקוד הקיים (שני ה-Frontends ושני ה-Backends) יועבר וינוהל בתוך Monorepo מרכזי (npm workspaces).
4.  **NFR4 (Mobile-First):** ה-Shell המרכזי וכל רכיב UI חדש יפותחו בגישת Mobile-First.
5.  **NFR5 (Tech Stack):** ה-Shell והרכיבים המשותפים ישתמשו ב-Next.js, TypeScript, MUI, ו-Tailwind CSS.

### Compatibility Requirements

1.  **CR1 (Databases):** בשלב זה, בסיסי הנתונים (MongoDB ו-PostgreSQL) יישארו נפרדים. כל אפליקציה תמשיך לגשת לבסיס הנתונים שלה בלבד.
2.  **CR2 (Identity Link):** הזהות המקשרת בין בסיסי הנתונים תהיה ה-`auth0_sub` (ה-ID של המשתמש ב-Auth0), אשר יתווסף לטבלאות המשתמשים בשני בסיסי הנתונים.
3.  **CR3 (Backend Services):** שני שירותי ה-Backend ימשיכו לפעול כשירותים נפרדים (`Private Service` ב-Render), והגישה אליהם תתבצע אך ורק דרך ה-API Gateway.
4.  **CR4 (CRA Integration):** ה-Frontend של ScheduleApp (הבנוי ב-CRA) ישולב בתוך ה-Shell של Next.js, כנראה באמצעות iframe או Micro-Frontend, עד להשלמת מיגרציה מלאה שלו ל-Next.js בעתיד.

## User Interface Enhancement Goals

### Integration with Existing UI
ה-UI החדש יתבסס על `apps/shell` (אפליקציית Next.js) שתשמש כמעטפת ניווט ראשית.

1.  **AuditsApp (Next.js):** הקוד יועבר ל-Monorepo וישולב באופן טבעי (natively) בתוך ה-Shell, תוך שימוש ב-Next.js App Router.
2.  **ScheduleApp (React CRA):** בשלב ראשון, האפליקציה הקיימת תועבר ל-Monorepo ותשולב בתוך ה-Shell באמצעות `iframe` או כ-Micro-Frontend. זאת כדי למזער שינויים מיידיים בקוד האפליקציה, עם תוכנית ארוכת טווח לבצע Refactor ל-Next.js.

### Modified/New Screens and Views
1.  **Shell Layout (חדש):** מסך הבסיס הראשי שיכיל את הניווט המשותף ויטעין לתוכו את האפליקציות.
2.  **Shared Navigation (חדש):** סרגל ניווט עליון קבוע ("בסגנון גוגל") שיאפשר מעבר בין "Audits", "Schedule", "Admin" וכו'.
3.  **Login/Logout (חדש):** דפי התחברות ויציאה מרכזיים שיטופלו על ידי ה-Shell ו-Auth0.
4.  **Admin User Management (חדש):** ממשק ניהול משתמשים מרכזי חדש שיאפשר לאדמינים ומנהלים ליצור משתמשים חדשים ולהקצות הרשאות.
5.  **AuditsApp Routes (קיים, משולב):** כל המסכים הקיימים של AuditsApp.
6.  **ScheduleApp Routes (קיים, משולב):** כל המסכים הקיימים של ScheduleApp (יוצגו בתוך ה-Shell).

### UI Consistency Requirements
1.  **ספריית רכיבים:** יש להשתמש ב-**MUI** כספריית הרכיבים הראשית לכל הרכיבים החדשים ב-Shell ובממשק הניהול.
2.  **Utility CSS:** יש להשתמש ב-**Tailwind CSS** עבור גמישות בעיצוב (utility-first) לצד MUI.
3.  **רכיבים משותפים:** תוקם ספרייה חדשה `packages/ui` ב-Monorepo שתכיל רכיבי React ו-MUI משותפים לשימוש חוזר.
4.  **Mobile-First:** כל הרכיבים החדשים ב-Shell ובממשק הניהול יפותחו בגישת Mobile-First.

## Technical Constraints and Integration Requirements

### Existing Technology Stack
הטכנולוגיות מבוססות על הניתוח במסמך הארכיטקטורה:

**AuditsApp (Modern Stack):**
* **Backend**: Node.js + Express.js
* **Frontend**: Next.js (App Router), React, TypeScript
* **Database**: MongoDB (via Mongoose)
* **Authentication**: Auth0

**ScheduleApp (Classic Stack):**
* **Backend**: Node.js + Express.js
* **Frontend**: React (CRA - Create React App)
* **Database**: PostgreSQL (via pg)
* **Authentication**: Internal JWT/bcrypt system (זהו הרכיב שיוחלף)

**Unified Stack (New Components):**
* **Frontend (Shell)**: Next.js (App Router), React, TypeScript
* **UI**: MUI (primary) with Tailwind CSS (utility)
* **State Management (Shell)**: Zustand
* **API Gateway**: Node.js + Express.js
* **Monorepo Tool**: npm workspaces

### Integration Approach

**Database Integration Strategy**:
* **Databases Remain Separate**: אין איחוד בסיסי נתונים בשלב זה. AuditsApp ממשיך להשתמש ב-MongoDB ו-ScheduleApp ממשיך להשתמש ב-PostgreSQL.
* **Unified Identifier**: ה-`auth0_sub` (Subject Identifier של Auth0) ישמש כמזהה הייחודי המקשר את זהות המשתמש בין Auth0 לשני בסיסי הנתונים.
* **Schema Change**: יש להוסיף עמודת `auth0_sub` לטבלת המשתמשים ב-PostgreSQL (ScheduleApp). יש לוודא שהשדה `auth0Id` קיים ומוגדר כ-unique ב-MongoDB (AuditsApp).

**API Integration Strategy**:
* **API Gateway**: כל התקשורת מה-Frontend (`apps/shell`) תעבור דרך `apps/api-gateway` חדש.
* **Central Auth Validation**: ה-Gateway יאמת את טוקן ה-Auth0 באופן מרכזי.
* **Routing**: ה-Gateway ינתב בקשות לשירותי ה-Backend הנכונים (`audits-be` או `schedule-be`), שיוגדרו כ-Private Services ב-Render.
* **Backend Auth Refactor**: ה-Backends יסמכו על ה-Gateway לאימות. יש להסיר לוגיקת אימות JWT/bcrypt מ-`schedule-be` ולהתאים את `audits-be` ו-`schedule-be` לזהות את המשתמש באמצעות `auth0_sub` (למשל, שיועבר ב-header מה-Gateway).

**Frontend Integration Strategy**:
* **Shell Application**: אפליקציית Next.js חדשה (`apps/shell`) תשמש כמעטפת הראשית.
* **AuditsApp (Next.js)**: ישולב באופן טבעי (natively) בתוך ה-Shell (הקוד יועבר ל-Monorepo).
* **ScheduleApp (CRA)**: ישולב בשלב ראשון באמצעות `iframe` או כ-Micro-Frontend כדי למזער סיכונים, עם תוכנית למיגרציה עתידית.

**Testing Integration Strategy**:
* **New Tests**: כל הקוד החדש (Shell, Gateway, לוגיקה משותפת) ידרוש כיסוי בדיקות (Vitest/Jest + Playwright).
* **Existing Apps**: לשתי האפליקציות הקיימות חסר כיסוי בדיקות משמעותי, מה שמגדיל את הסיכון. יש לבצע בדיקות E2E (עם Playwright) במיוחד על תהליכי האימות והניווט המשולבים.

### Code Organization and Standards

**File Structure Approach**:
* **Monorepo**: הפרויקט יאורגן במבנה Monorepo באמצעות npm workspaces.
* **Structure**:
    * `/apps/shell/`: ה-Frontend המרכזי (Next.js)
    * `/apps/api-gateway/`: ה-API Gateway (Node/Express)
    * `/apps/audits-be/`: Backend קיים (Node/Express)
    * `/apps/schedule-be/`: Backend קיים (Node/Express)
    * `/packages/ui/`: רכיבי React ו-MUI משותפים
    * `/packages/types/`: הגדרות TypeScript משותפות
    * `/packages/auth-client/`: לוגיקת Auth0 משותפת ל-Frontend

**Naming Conventions**:
* **Packages**: `kebab-case` (e.g., `auth-client`)
* **Components**: `PascalCase` (e.g., `SharedNav.tsx`)
* **API Endpoints**: `kebab-case` (e.g., `/api/users/create`)

**Coding Standards**:
* **Language**: TypeScript היא הסטנדרט לכל קוד חדש.
* **Modules**: ES Modules (import/export) הם הסטנדרט.
* **Linting**: ESLint ו-Prettier יאכפו באמצעות הגדרות משותפות (`packages/config`).
* **Data Access**: לוגיקה (בקרים/רכיבים) חייבת לקרוא לשכבת שירות או Repository; לעולם לא לשאול את בסיס הנתונים ישירות.
* **Accessibility**: רכיבי UI חדשים ב-Shell וב-`packages/ui` חייבים לעמוד בתקן WCAG 2.1 Level AA.

### Deployment and Operations

**Build Process Integration**:
* **Render Monorepo**: הפלטפורמה תוגדר לתמוך ב-Monorepo. כל אפליקציה ב-`/apps/` תוגדר כשירות נפרד ב-Render.
* **Selective Builds**: Render יזהה אוטומטית שינויים בספריות משנה רלוונטיות ויבנה מחדש רק את השירותים שהשתנו.

**Deployment Strategy**:
* **Phased Rollout**: המערכת החדשה תיבנה ותיבדק בסביבת Staging נפרדת.
* **Production Switchover**: המעבר ל-Production ינוהל באמצעות עדכון DNS שיפנה ל-`apps/shell` החדש.
* **Backend Services**: ה-Backends (`audits-be`, `schedule-be`) יוגדרו כ-**Private Services** ב-Render, ויקבלו תעבורה רק מה-API Gateway.

**Monitoring and Logging**:
* יש להגדיר שירותי לוגינג ומעקב (למשל, LogRocket/Sentry) עבור ה-Shell וה-Gateway כדי לנטר את תהליך האיחוד.

**Configuration Management**:
* **Secrets**: כל הסודות (DB URLs, API keys, Auth0 Client Secret) ינוהלו אך ורק באמצעות Render Environment Variables.
* **Environment Config**: משתני סביבה יאוחסנו בקובץ config מרכזי (כמו בדוגמת `config.js` שצוינה בארכיטקטורה).

### Risk Assessment and Mitigation

**Technical Risks**:
* **ScheduleApp Auth Migration**: הסיכון הגבוה ביותר. מיגרציה של מערכת אימות קיימת ל-Auth0 היא תהליך מורכב.
* **Lack of Tests**: לשתי האפליקציות חוסר בכיסוי בדיקות אוטומטיות, מה שמגדיל סיכון לרגרסיות.
* **CRA Integration**: שילוב אפליקציית CRA (ב-iframe או MFE) בתוך Next.js עלול ליצור בעיות ניווט, אימות ו-UI/UX.

**Integration Risks**:
* **Data Consistency**: שמירה על סנכרון זהות משתמש (`auth0_sub`) בין שלוש מערכות (Auth0, Mongo, Postgres).
* **API Gateway**: ה-Gateway הופך לנקודת כשל יחידה (SPOF).

**Deployment Risks**:
* **Production Cutover**: עדכון ה-DNS הוא מהיר, אך אם מתגלה בעיה, החזרה אחורה דורשת עדכון DNS נוסף (שעלול לקחת זמן להתעדכן גלובלית).

**Mitigation Strategies**:
* **Staging Environment**: בדיקות יסודיות של *כל* התהליכים בסביבת Staging נפרדת לחלוטין.
* **Auth Migration Testing**: תסריט בדיקה ידני מקיף ייכתב במיוחד עבור מיגרציית האימות של ScheduleApp.
* **E2E Tests**: כתיבת בדיקות Playwright חדשות לכיסוי תהליכי הליבה (לוגין, SSO, ניווט) לפני העלייה ל-Production.
* **Rollback Plan**: שמירה על האפליקציות הישנות פועלות ב-Production בכתובות ה-URL הישנות שלהן, כך שניתן יהיה להחזיר את ה-DNS אליהן במקרה חירום.
* **Feature Flags**: שימוש ב-Feature Flags לשחרור מדורג של ה-Shell המאוחד.

## Epic and Story Structure

### Epic Approach
**Epic Structure Decision**: אנו נגדיר אפיק מרכזי אחד ויחיד עבור פרויקט האיחוד.

**Rationale**:
העבודה הזו היא יחידה אינטגרטיבית אחת. ה-Shell (`apps/shell`), ה-API Gateway (`apps/api-gateway`), ומיגרציית האימות של `schedule-be` תלויים לחלוטין זה בזה. לא ניתן לשחרר אף אחד מהם בנפרד ולקבל ערך. לכן, הגישה הנכונה היא לנהל את כל העבודה תחת אפיק אחד שמטרתו "לספק את הפלטפורמה המאוחדת גרסה 1.0".

## Epic 1: Legenda Platform Unification V1

**Epic Goal**: לספק פלטפורמה מאוחדת (Shell, API Gateway, ו-Auth0) עבור AuditsApp ו-ScheduleApp, כולל מיגרציה מלאה של מערכת האימות של ScheduleApp, תוך שמירה על יציבות מלאה של שירותי ה-Production הקיימים.

**Integration Requirements**:
* כלל השירותים יפעלו בתוך Monorepo מבוסס npm workspaces.
* הגישה לכל שירותי ה-Backend תתבצע *אך ורק* דרך ה-API Gateway.
* האימות יתבצע *אך ורק* מול Auth0.
* בסיסי הנתונים יישארו נפרדים.
* `auth0_sub` ישמש כמזהה המשתמש האוניברסלי.

[...]
#### Target User Personas
* **Administrator (Network level):** משתמש טכני שאחראי על הגדרות מערכת גלובליות, יצירת חנויות, ומנהלים/מנהלים אזוריים. זקוק לשליטה מלאה ויכולות ניהול מתקדמות.
* **Regional Manager:** אחראי על מספר חנויות. זקוק לסקירה כללית, יכולת לנהל מנהלי חנויות באזור שלו, וגישה לדוחות אזוריים. בנוסף, יכול לצפות ולבצע בקרות (Audits) בסניפים שתחת אחריותו ו*לעדכן מידע עבור משתמש ה-"Store"*.
* **Manager (Store level):** אחראי על חנות אחת או יותר. זקוק ליכולת לנהל עובדים בחנות שלו (יצירה, שיבוץ בלו"ז), לצפות בבקרות (Audits) שבוצעו בחנות/חנויות שלו, ולנהל את לוח הזמנים (Schedule) של העובדים. יכול להכין צ'קליסטים לחנות ומשימות ו*לעדכן מידע עבור משתמש ה-"Store"*.
* **Employee:** משתמש קצה שצריך לצפות בלוח הזמנים שלו ולמלא זמינות עתידית בלוח הזמנים. בעתיד יגש לקורסים ומידע. חוויה פשוטה וישירה היא קריטית. רלוונטי לו גם המידע המוצג ב-"Store".
* **Store:** **חשבון משתמש נפרד ומשותף לחנות** (כמו טאבלט בחנות) עם שם משתמש וסיסמה משלו. דרכו ניתן לצפות בבקרות ומשימות שהוכנו על ידי המנהלים (חנות/אזורי). ניתן למלא צ'קליסטים דרכו. בעתיד יכיל מערכת ניהול מלאה לחנות (נהלים, מתכונים וכו'). *התוכן בחשבון זה מעודכן על ידי ה-Manager וה-Regional Manager*.

---

### Story 1.1: Monorepo & Core Services Scaffolding

**As a** DevOps Engineer,
**I want** to set up the npm workspaces Monorepo structure,
**so that** all new and migrated applications (Shell, Gateway, Backends) can be versioned and managed from one location.

#### Acceptance Criteria
1.  נוצר Monorepo חדש (`legend-platform/`) עם **npm workspaces** (מוגדר ב-`package.json` השורשי).
2.  נוצרו ספריות ריקות (`scaffolding`) עבור: `apps/shell`, `apps/api-gateway`, `apps/audits-be`, `apps/schedule-be`.
3.  נוצרו ספריות ריקות עבור: `packages/ui`, `packages/types`, `packages/auth-client`.
4.  הוגדרו קבצי ESLint, Prettier, ו-tsconfig בסיסיים ומשותפים ב-`packages/config`.
5.  הוגדרו שירותים חדשים ב-Render (בסביבת Staging) עבור ה-Shell וה-Gateway.

---

### Story 1.2: Shell Auth0 Integration

**As a** User,
**I want** to log in and log out of the new Shell application using my Auth0 credentials,
**so that** I have a single point of entry to the unified platform.

#### Acceptance Criteria
1.  `apps/shell` (Next.js) מוגדר עם Auth0 SDK.
2.  לחיצה על "Login" ב-Shell מפנה ל-Auth0 Universal Login.
3.  לאחר התחברות מוצלחת, המשתמש מוחזר ל-Shell ומזוהה (ה-Shell מציג את שמו).
4.  לחיצה על "Logout" מנקה את הסשן (session) ומחזירה את המשתמש לדף ההתחברות.
5.  (תלות: 1.1)

---

### Story 1.3: API Gateway & Central Token Validation

**As a** Backend Developer,
**I want** the API Gateway to receive requests from the Shell, validate the Auth0 JWT token,
**so that** all downstream services (backends) can trust that the request is authenticated.

#### Acceptance Criteria
1.  `apps/api-gateway` (Node/Express) מוגדר.
2.  ה-Gateway חושף נקודת קצה (endpoint) ראשונית (למשל, `/api/v1/health-check`).
3.  ה-Gateway כולל middleware שמאמת (validates) את טוקן ה-Auth0 (שנשלח מה-Shell) בכל בקשה.
4.  אם הטוקן לא תקין, ה-Gateway מחזיר שגיאת 401 Unauthorized.
5.  אם הטוקן תקין, ה-Gateway מעביר את הבקשה (בסטורי זה, רק ל-health-check) ומצרף `x-user-id` (המכיל את ה-`auth0_sub`) לבקשה.
6.  (תלות: 1.2)

---

### Story 1.4: AuditsApp (Next.js + BE) Integration

**As a** DevOps Engineer,
**I want** to migrate the existing AuditsApp (Frontend & Backend) into the Monorepo and route its traffic through the API Gateway,
**so that** it becomes the first application fully integrated into the unified platform.

#### Acceptance Criteria
1.  הקוד של AuditsApp-Frontend הועבר ל-`apps/shell` (תחת `/app/(main)/audits/...`).
2.  הקוד של AuditsApp-Backend הועבר ל-`apps/audits-be`.
3.  `apps/audits-be` מוגדר כ-Private Service ב-Render.
4.  `apps/api-gateway` מנתב בקשות מ-`/api/v1/audits/*` אל `apps/audits-be`.
5.  `apps/audits-be` עודכן כך שהוא סומך על ה-header `x-user-id` מה-Gateway (במקום לבצע אימות Auth0 בעצמו).
6.  משתמש שמחובר ל-Shell (מ-1.2) יכול לנווט לאזור ה-Audits ולבצע פעולות (למשל, לצפות בביקורות).
7.  (תלות: 1.3)

---

### Story 1.5: ScheduleApp Backend Auth Migration

**As a** Backend Developer,
**I want** to refactor the `schedule-be` to remove all internal JWT/bcrypt logic and rely solely on the API Gateway for authentication,
**so that** it can support Auth0 SSO.

#### Acceptance Criteria
1.  כל הקוד ב-`apps/schedule-be` שקשור ליצירת/אימות JWT פנימי והשוואת סיסמאות (bcrypt) הוסר.
2.  נוספה עמודת `auth0_sub` (VARCHAR, UNIQUE) לטבלת המשתמשים ב-PostgreSQL.
3.  נוצר סקריפט מיגרציה חד-פעמי (ייבדק ב-Staging) שמעביר משתמשים קיימים ל-Auth0 (דרך ה-API של Auth0) ומאכלס את ה-`auth0_sub` החדש בטבלה.
4.  **הסקריפט (מ-AC3) נבדק ביסודיות בסביבת Staging על נתונים מדומים כדי לוודא תקינות לפני הרצה על Production.**
5.  ה-Backend עודכן כך שהוא מזהה משתמשים אך ורק באמצעות ה-`x-user-id` (auth0_sub) שמתקבל מה-Gateway.
6.  `apps/api-gateway` מנתב בקשות מ-`/api/v1/schedule/*` אל `apps/schedule-be`.
7.  (תלות: 1.3)
---

### Story 1.6: ScheduleApp Frontend (CRA) Integration

**As a** Frontend Developer,
**I want** to integrate the existing ScheduleApp (CRA) into the Shell and connect it to the API Gateway,
**so that** users can access ScheduleApp via the unified platform SSO.

#### Acceptance Criteria
1.  הקוד של ScheduleApp-Frontend הועבר ל-Monorepo (ייתכן כספרייה עצמאית או בתוך `apps/shell`).
2.  ה-Shell (ב-Next.js) טוען את אפליקציית ה-CRA (למשל, בתוך `iframe` או כ-MFE) כאשר המשתמש מנווט ל-`/schedule`.
3.  אפליקציית ה-CRA עודכנה כך שהיא *לא* מבצעת לוגין בעצמה, אלא מקבלת את טוקן ה-Auth0 מה-Shell (**לדוגמה, באמצעות `window.postMessage` מה-Shell ל-iframe**).
4.  אפליקציית ה-CRA עודכנה כך שהיא שולחת את כל בקשות ה-API שלה ל-API Gateway (`/api/v1/schedule/*`) בצירוף הטוקן שקיבלה.
5.  משתמש שמחובר ל-Shell יכול לנווט לאזור ה-Schedule ולבצע פעולות (למשל, לצפות בלו"ז).
6.  (תלות: 1.5)
---

### Story 1.7: Hierarchical User Creation (Admin UI & API)

**As a** System Administrator,
**I want** a central user management interface within the Shell,
**so that** I can create new Managers and Regional Managers hierarchically.

#### Acceptance Criteria
1.  נוצר אזור "Admin" חדש ב-`apps/shell` שמוגן וגלוי רק לאדמינים.
2.  האזור מכיל טופס ליצירת משתמש חדש (מנהל / מנהל אזורי) עם שדות (שם, אימייל, תפקיד, חנויות מורשות).
3.  נוצרה נקודת קצה (endpoint) ב-`apps/api-gateway` (למשל, `POST /api/v1/admin/users`) שמאובטחת לאדמינים בלבד.
4.  ה-Endpoint קורא ל-API של Auth0 ליצירת המשתמש (ללא סיסמה).
5.  ה-Endpoint שולח למשתמש החדש אימייל הזמנה (Invitation) מ-Auth0 להגדרת סיסמה.
6.  ה-Endpoint מסנכרן את המשתמש החדש (כולל `auth0_sub` ותפקיד) לבסיסי הנתונים הלוקאליים (Mongo ו-Postgres).
7.  (תלות: 1.6)

---

### Story 1.8: Hierarchical User Creation (Manager UI & API)

**As a** Store Manager,
**I want** a user management interface within the Shell,
**so that** I can create new Employee users only for the stores I manage.

#### Acceptance Criteria
1.  ממשק ניהול המשתמשים (מ-1.7) גלוי גם למנהלים, אך מציג פונקציונליות מוגבלת.
2.  מנהל יכול ליצור רק משתמשים בתפקיד "Employee".
3.  מנהל יכול לשייך עובדים חדשים *אך ורק* לחנויות שהוא עצמו מנהל (ה-API Gateway אוכף זאת).
4.  תהליך היצירה (קריאה ל-Auth0, שליחת הזמנה, סנכרון לבסיסי הנתונים) זהה ל-1.7.
5.  (תלות: 1.7)

### Story 1.9: Basic Monitoring Setup

**As a** DevOps Engineer,
**I want** to implement basic monitoring and alerting for the new core services (API Gateway, User Sync process),
**so that** we can proactively identify issues during and after the rollout.

#### Acceptance Criteria
1.  שירות ה-API Gateway (`apps/api-gateway`) מחובר לשירות Monitoring (כמו Render Metrics או שירות חיצוני כמו Sentry/Datadog).
2.  מוגדרים Alerts בסיסיים עבור ה-Gateway: שיעור שגיאות גבוה (למשל, >5% שגיאות 5xx), זמן תגובה גבוה (למשל, >1 שנייה בממוצע).
3.  תהליך סנכרון המשתמשים (FR10, כנראה ממומש ב-Gateway או ב-Backends) כולל לוגים ברורים עבור הצלחה, כשל, ויצירת משתמש חדש.
4.  מוגדר Alert (אם אפשרי) עבור כשלים חוזרים בסנכרון משתמשים.
5.  (תלות: 1.7 - מכיוון שתהליך הסנכרון והיצירה ממומשים שם)
# Coffee Sensory App — Esqueleto

App para registrar anotaciones sensoriales de café, con sesiones colaborativas
tipo Master/Catador, motor de scoring configurable y dashboard imprimible.
Inspirada en el flujo de [The Coffee Rose](https://rose.cafeimports.com/) de Cafe Imports.

## Stack

- **Expo (React Native) + Expo Router** → Android, Web, e iOS a futuro desde un solo código.
- **Firebase (Firestore + Auth)** → backend, con persistencia offline incorporada (sin SQLite manual).
- **Motor de scoring propio** (`src/scoring/`) → desacoplado de Firebase/UI, fácil de testear y extender.

## Instalación

```bash
# 1. Instalar Expo CLI si no lo tienes
npm install -g expo-cli   # opcional, npx funciona igual

# 2. Instalar dependencias
npm install

# 3. Configurar Firebase
cp .env.example .env
# Rellena .env con los valores de tu proyecto (Firebase Console > Project Settings)

# 4. Crear el proyecto de Firebase (si no existe)
#    - Crea un proyecto en https://console.firebase.google.com
#    - Habilita Firestore (modo producción)
#    - Habilita Authentication > Sign-in method:
#        • Anonymous (para catadores invitados)
#        • Email/Password (para Masters/organizaciones)
#    - Despliega las reglas de seguridad:
firebase deploy --only firestore:rules   # requiere firebase-tools instalado y `firebase login`

# 5. Correr la app
npx expo start          # abre el menú interactivo (escanea QR para Android, "w" para Web)
npx expo start --web    # directo a Web
npx expo start --android
```

## Estructura del proyecto

```
app/                          # Rutas (Expo Router)
  index.tsx                   # Pantalla inicial: crear sesión (Master) o unirse (Catador)
  (app)/session/[id].tsx       # Ramifica a MasterDashboardScreen o TasterScoringScreen

src/
  types/domain.ts             # Contrato de tipos: Session, ScoringProfile, FlavorAttribute, etc.
  scoring/
    engine.ts                 # Motor de cálculo de puntaje (puro, sin dependencias externas)
    customFormulas.ts         # Registro de fórmulas custom (punto de extensión)
    profiles/defaults.ts      # Perfiles de scoring que vienen por defecto
    __manual_test__.ts        # Test manual del motor, corre sin Firebase/UI
  data/
    defaultFlavorAttributes.ts # Set inicial de descriptores (flavor wheel simplificado)
  services/
    sessionService.ts         # Crear/cerrar sesión, unirse por código, participantes, cafés
    joinCodeService.ts        # Generación/resolución/liberación del código de 6 dígitos (estilo Kahoot)
    authService.ts            # Login anónimo (catadores) + email/password (Masters)
    scoreService.ts           # Lectura/escritura de puntajes por catador
    flavorAttributeService.ts # Catálogo de descriptores (defaults + custom por organización)
  hooks/
    useAuth.tsx                # Contexto raíz de autenticación (AuthProvider + useAuth())
    useTasterScoring.ts         # Selección de descriptores + cálculo en vivo + guardado debounced
    useMasterDashboard.ts       # Agregación en vivo de scores para el dashboard del Master
  components/                 # TasterScoringScreen, MasterDashboardScreen

firestore.rules               # Reglas de seguridad (Master vs Catador, incluye joinCodes)
```

## Decisiones de arquitectura (resumen del por qué)

1. **No usamos SQLite manual**: Firestore con `localCache: { kind: 'persistent' }` ya
   maneja la persistencia local y la sincronización automática, incluyendo cuando
   un catador trabaja momentáneamente sin red. Esto reemplaza directamente lo que
   habría hecho un esquema "SQLite local + sync al final" con mucho menos código propio.

2. **Un documento por catador por café, sobreescrito (no acumulado)**:
   `sessions/{id}/coffees/{coffeeId}/scores/{userId}`. Esto mantiene los costos de
   Firestore bajos y hace que el listener del Master sea trivial (`onSnapshot`
   sobre la colección de scores).

3. **El motor de scoring es puro y testeable** (`src/scoring/engine.ts`): no importa
   nada de Firebase ni de React Native. Recibe selecciones + atributos + un
   `ScoringProfile` y devuelve un número. Esto permite:
   - Testear la lógica de puntaje sin levantar la app (`npm run test:scoring`).
   - Soportar **varios sistemas de puntaje por defecto** (`profiles/defaults.ts`)
     y agregar nuevos sin tocar el motor.
   - Extender con fórmulas completamente custom vía `customFormulas.ts`.

4. **Atributos de sabor extensibles por organización** (`flavorAttributeService.ts`):
   los defaults viven en código (no requieren red), y cada organización puede
   agregar los suyos en Firestore. Este es el USP que mencionaste: no es un
   lexicon cerrado, es un catálogo configurable.

5. **El rol (Master/Catador) se decide al entrar a la sesión**: crear una sesión
   te hace Master automáticamente; unirte con el id/código de una sesión existente
   te agrega como Catador. Las Firestore Rules (`firestore.rules`) refuerzan esto
   a nivel de datos, no solo en la UI.

6. **Unión a la sesión vía código de 6 dígitos (estilo Kahoot)**: en vez de que
   el catador deba escribir el id largo de Firestore, el Master ve un código
   corto generado al crear la sesión (`joinCodeService.ts`). El código:
   - Se garantiza único entre sesiones activas usando una transacción de Firestore
     sobre la colección `joinCodes` (si hay colisión, se reintenta con otro código).
   - Se libera automáticamente al cerrar la sesión (`closeSession`), para que
     pueda reutilizarse sin riesgo de apuntar a una sesión vieja.
   - Es solo una capa de conveniencia: el `sessionId` real de Firestore sigue
     siendo la fuente de verdad; el código es un "alias corto" temporal.

7. **Autenticación con dos caminos** (`authService.ts` + `useAuth.tsx`):
   - **Catador invitado** → `signInAnonymously()`. Sin fricción: solo pide
     el nombre y entra directo con el código de sesión. Firebase le asigna
     un `uid` real, así que las Firestore Rules (`request.auth.uid`) funcionan
     exactamente igual que con un usuario registrado.
   - **Master/organización** → Email + Password, con un documento espejo en
     `/users/{uid}` (`AppUser`) para guardar `organizationId` y datos de perfil
     que persistan entre dispositivos.
   - En React Native, la sesión de Auth necesita persistencia explícita vía
     `AsyncStorage` (`getReactNativePersistence`) o se pierde al cerrar la app;
     en Web usa `browserLocalPersistence`. Esto ya está resuelto en
     `src/config/firebase.ts` según la plataforma.
   - Un usuario anónimo puede en el futuro "subir de categoría" a cuenta
     completa con `linkWithCredential()` — no implementado todavía, queda
     como mejora natural si un catador frecuente quiere registrarse.

## Próximos pasos sugeridos

- [x] Conectar Firebase Auth real — anónimo para catadores, email/password para Masters.
- [ ] Permitir que un catador anónimo "suba de categoría" a cuenta completa (`linkWithCredential`).
- [ ] Reemplazar la lista de descriptores por categoría en `TasterScoringScreen`
      por un componente `<FlavorWheel />` en SVG (más fiel a la referencia de Coffee Rose).
- [ ] Agregar pantalla de administración de `FlavorAttribute` y `ScoringProfile` por organización.
- [ ] Vista impresa dedicada (CSS `@media print` o componente separado) en vez de imprimir la pantalla completa del dashboard.
- [ ] Modo "blind cupping": ocultar `coffee.name` a los catadores cuando `session.isBlind === true` (mostrar solo `tableLabel`).
- [ ] Tests automatizados (Jest) para `src/scoring/engine.ts` a partir del script manual ya incluido.

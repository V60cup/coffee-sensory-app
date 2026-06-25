# Ensamble

App para registrar anotaciones sensoriales de café, con sesiones colaborativas
tipo Master/Catador y dashboard en vivo. El objetivo no es producir un puntaje
único, sino **caracterizar** el café: qué descriptores aromáticos aparecen,
con qué intensidad, cómo se perciben los gustos básicos (dulce, ácido,
amargo), y qué tan idóneo resulta para su propósito.

Inspirada en el flujo de [The Coffee Rose](https://rose.cafeimports.com/) de
Cafe Imports y en las hojas de cata de [CoffeeMind](https://coffee-mind.com/product/work-flow-business-card/)

🔗 **App publicada:** Accede aqui a la app! [Deploy](https://sensory-app-5b255.web.app))_.

## Stack

- **Expo (React Native) + Expo Router** → Android, Web, e iOS desde un solo código.
- **Firebase (Firestore + Auth)** → backend, con persistencia offline incorporada (sin SQLite manual).
- **Firebase Hosting** → publicación web, plan gratuito (Spark) suficiente para el uso actual.

## Cómo usar la app

### Si eres Master (organizas la cata)

1. Abre la app y selecciona **"Soy Master"**.
2. Crea una cuenta o inicia sesión con email y contraseña.
3. Ingresa el nombre de la sesión y presiona **"Entrar y crear sesión"**.
4. La app te muestra un **código de 6 dígitos**. Compártelo con los catadores
   (verbalmente, por chat, o mostrando la pantalla).
5. Agrega los cafés que se van a catar desde el dashboard.
6. A medida que los catadores van caracterizando cada café, el dashboard se
   actualiza **en vivo**: descriptores más mencionados, consenso entre
   catadores, promedios de gustos básicos e idoneidad.
7. Cuando termines, cierra la sesión desde el dashboard. El código de 6
   dígitos se libera y puede reutilizarse en una sesión futura.

### Si eres Catador (participas en una cata)

1. Abre la app y selecciona **"Tengo un código"**.
2. Ingresa tu nombre y el código de 6 dígitos que te dio el Master.
   No necesitas crear una cuenta.
3. Para cada café:
   - Toca la **rueda de aromas** para marcar los descriptores que percibes,
     con su intensidad.
   - Usa los **sliders de gustos básicos** (dulce, ácido/agrio, amargo) y el
     de **idoneidad**, deslizando con el dedo o el mouse.
   - Agrega notas libres si quieres detallar algo que la rueda no captura.
4. Tus respuestas se guardan automáticamente — no hay botón de "enviar".

## Estructura del proyecto

```
app/                           # Rutas (Expo Router)
  index.tsx                    # Pantalla inicial: crear sesión (Master) o unirse (Catador)
  (app)/session/[id].tsx        # Ramifica a MasterDashboardScreen o TasterScoringScreen

src/
  types/domain.ts              # Contrato de tipos: Session, FlavorAttribute, TasterProfile, etc.
  data/
    defaultFlavorAttributes.ts # Set inicial de descriptores (flavor wheel simplificado)
  services/
    sessionService.ts          # Crear/cerrar sesión, unirse por código, participantes, cafés
    joinCodeService.ts         # Generación/resolución/liberación del código de 6 dígitos (estilo Kahoot)
    authService.ts             # Login anónimo (catadores) + email/password (Masters)
    scoreService.ts            # Lectura/escritura de perfiles de catación por catador
    flavorAttributeService.ts  # Catálogo de descriptores (defaults + custom por organización)
  hooks/
    useAuth.tsx                 # Contexto raíz de autenticación (AuthProvider + useAuth())
    useTasterProfile.ts         # Selección de descriptores + gustos básicos + idoneidad + guardado debounced
    useMasterDashboard.ts       # Agregación en vivo de perfiles para el dashboard del Master
    useSessionDashboard.ts      # Resumen de todos los cafés de una sesión
  components/
    FlavorWheel.tsx             # Rueda de aromas interactiva, con anillos de intensidad estilo SCA
    TasterScoringScreen.tsx     # Pantalla del catador
    MasterDashboardScreen.tsx   # Pantalla del Master
    ui/
      RatingSlider.tsx          # Slider 0-9 para gustos básicos e idoneidad

firestore.rules                # Reglas de seguridad (Master vs Catador, incluye joinCodes)
firebase.json                  # Config de Firestore + Hosting
```

## Instalación local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar Firebase
cp .env.example .env
# Rellena .env con los valores de tu proyecto (Firebase Console > Project Settings)

# 3. Crear el proyecto de Firebase (si no existe)
#    - Crea un proyecto en https://console.firebase.google.com
#    - Habilita Firestore (modo producción)
#    - Habilita Authentication > Sign-in method:
#        • Anonymous (para catadores invitados)
#        • Email/Password (para Masters/organizaciones)
#    - Despliega las reglas de seguridad:
npx firebase deploy --only firestore:rules

# 4. Correr la app
npx expo start          # abre el menú interactivo (escanea QR para Android, "w" para Web)
npx expo start --web    # directo a Web
npx expo start --android
```

## Deploy

La app se publica como sitio web (PWA) en **Firebase Hosting**, sin pasar por
revisión de App Store / Google Play. Los catadores acceden desde el navegador
de su propio celular, sin instalar nada.

```bash
# Primera vez: instalar el CLI y autenticarse
npm install -g firebase-tools   # o usa npx firebase ... si prefieres no instalar global
npx firebase login
npx firebase init hosting
# directorio público: dist
# ¿single-page app? → No (este proyecto usa web.output: "static" en app.json)

# Cada vez que quieras publicar una actualización
npm run deploy-hosting
```

`deploy-hosting` corre `expo export -p web` (genera el build en `dist/`) y
luego `firebase deploy --only hosting`. Al finalizar, el CLI imprime la URL
pública (algo como `https://tu-proyecto.web.app`).

*
## Cómo contribuir

1. **Haz fork** del repositorio y clona tu fork localmente.
2. Crea una rama descriptiva a partir de `main`:
   ```bash
   git checkout -b feature/nombre-corto-del-cambio
   ```
3. Sigue las convenciones del proyecto:
   - TypeScript estricto (`tsconfig.json` tiene `"strict": true`) — corre
     `npx tsc --noEmit` antes de subir cambios y resuelve cualquier error.
   - La capa de dominio (`src/types/domain.ts`) es el contrato compartido
     entre UI y servicios. Si cambias un tipo ahí, revisa todos los archivos
     que lo importan.
   - Los servicios (`src/services/`) no deben importar nada de React Native
     ni de componentes — solo Firebase y tipos de dominio.
   - Los componentes y hooks que escriben en Firestore deben usar debounce
     para cambios frecuentes (ver `useTasterProfile.ts` como referencia), para
     no generar escrituras innecesarias.
4. Prueba localmente en **Web y Android** como mínimo antes de abrir un PR
   (`npx expo start --web` y `npx expo start --android`). Si el cambio afecta
   gestos táctiles (como los sliders), revisa también que funcione con mouse
   en navegador, no solo con touch — `react-native-web` no siempre soporta
   las mismas APIs que React Native nativo (ver comentarios en
   `RatingSlider.tsx` para un ejemplo concreto de esta limitación).
5. Si el cambio toca `firestore.rules`, agrega o actualiza las reglas
   relevantes y pruébalas contra los roles `master`/`taster` antes de pedir
   revisión — un permiso de más en las reglas es un problema de seguridad,
   no solo un bug funcional.
6. Abre un **Pull Request** contra `main` describiendo:
   - Qué problema resuelve o qué funcionalidad agrega.
   - Qué archivos toca y por qué (especialmente si modificas `domain.ts` o
     `firestore.rules`).
   - Cómo lo probaste.

### Reportar bugs o proponer ideas

Abre un **Issue** en GitHub con:
- Pasos para reproducir (si es un bug).
- Plataforma donde ocurre (Web, Android, iOS).
- Captura de pantalla si aplica.


# Ensamble

App para registrar anotaciones sensoriales de café, con sesiones colaborativas tipo Master/Catador, rueda de aromas interactiva, historial de sesiones y dashboard en vivo.

El objetivo no es producir un puntaje único, sino **caracterizar** el café: qué descriptores aromáticos aparecen, con qué intensidad, cómo se perciben los gustos básicos —dulce, ácido/agrio y amargo— y qué tan idóneo resulta para su propósito.

Inspirada en el flujo de [The Coffee Rose](https://rose.cafeimports.com/) de Cafe Imports y en referencias de trabajo sensorial como CoffeeMind.

App publicada: [Deploy](https://sensory-app-5b255.web.app)

---

## Stack

- **Expo / React Native**
- **Expo Router**
- **Firebase Authentication**
- **Cloud Firestore**
- **Firebase Hosting**
- **AsyncStorage** para persistencia local de borradores

La estrategia actual busca usar Firestore solo para datos confirmados y colaborativos. Los borradores temporales del Master se guardan localmente en el dispositivo para reducir lecturas y escrituras.

---

## Cómo usar la app

### Si eres Master

1. Abre la app y selecciona **Soy Master**.
2. Crea una cuenta o inicia sesión con email y contraseña.
3. Ingresa el nombre de la sesión.
4. Crea la sesión.
5. La app genera un **código de 6 dígitos** para compartir con los catadores.
6. Agrega cafés al dashboard.
7. Cada café puede incluir:
   - nombre;
   - origen;
   - variedad / cultivar;
   - proceso;
   - fecha de cosecha;
   - descripción.
8. Si sales del dashboard antes de agregar el café, el formulario se conserva como **borrador local** en el mismo dispositivo.
9. A medida que los catadores evalúan, el dashboard muestra resultados en vivo.
10. Desde el historial puedes volver a sesiones previas.
11. Las sesiones antiguas pueden archivarse para ocultarlas del historial normal.

### Si eres Catador

1. Abre la app y selecciona **Tengo un código**.
2. Ingresa tu nombre y el código de 6 dígitos entregado por el Master.
3. Para cada muestra:
   - selecciona descriptores en la rueda sensorial;
   - asigna intensidad;
   - evalúa dulce, ácido/agrio y amargo;
   - evalúa idoneidad;
   - agrega notas libres.
4. Las respuestas se guardan automáticamente.

---

## Flujo de datos

### Firestore

Firestore se usa para datos colaborativos o definitivos:

```txt
sessions/{sessionId}
sessions/{sessionId}/participants/{userId}
sessions/{sessionId}/coffees/{coffeeId}
sessions/{sessionId}/coffees/{coffeeId}/scores/{userId}
joinCodes/{code}
users/{userId}
flavorAttributes/{attributeId}
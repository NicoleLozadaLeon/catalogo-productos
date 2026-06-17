# ADR-001: Elección de Ruta A y de los Pilares 2 + 4

## Estado
Aceptado

## Contexto

El proyecto exige elegir una ruta de trabajo (A: "Build & Modernize" o B,
según las bases del curso) y dos pilares técnicos a profundizar, dentro de
un presupuesto acotado ($50) y un entorno con restricciones propias de un
AWS Academy Learner Lab (sin permisos para crear roles IAM propios, sin
acceso a todos los servicios de AWS, credenciales temporales que expiran
cada 4 horas).

El catálogo de productos es un caso de uso clásico de CRUD con persistencia
relacional y manejo de archivos (imágenes), lo que lo hace apto tanto para
un enfoque monolítico tradicional como para uno modernizado con piezas
serverless.

## Decisión

- **Ruta A — "Build & Modernize":** se construye primero un monolito
  tradicional (Express + PostgreSQL, todo en un solo proceso) y luego se
  moderniza incorporando infraestructura como código y una pieza serverless,
  en vez de partir de una arquitectura nativa de nube desde cero.
- **Pilar 2 — Terraform / IaC:** toda la infraestructura (red, cómputo, base
  de datos, almacenamiento, función serverless) se define como código,
  versionado en el mismo repositorio que la aplicación.
- **Pilar 4 — Serverless:** el procesamiento de imágenes (generación de
  miniaturas) se desacopla de la app mediante una función Lambda disparada
  por eventos de S3.

## Justificación

1. **Sinergia entre pilares:** Terraform es quien aprovisiona tanto la
   infraestructura "tradicional" (VPC, EC2, RDS) como la serverless (S3,
   Lambda, permisos de invocación), lo que permite demostrar manejo de IaC
   en dos paradigmas distintos con una sola herramienta.
2. **Caso de uso natural para serverless:** la generación de miniaturas es
   un trabajo intermitente, de corta duración y disparado por eventos —
   exactamente el perfil de carga para el que Lambda es la opción de costo
   y complejidad óptimos frente a tener un proceso o servidor dedicado
   corriendo permanentemente para esa tarea.
3. **Restricciones del Learner Lab:** Pilares que requieren crear roles IAM
   personalizados, configurar servicios de orquestación de contenedores
   (EKS/ECS con roles propios) o multi-cuenta no son viables porque el
   Learner Lab solo permite usar el rol predefinido `LabRole`/
   `LabInstanceProfile`. Terraform y Lambda funcionan plenamente dentro de
   esa restricción.
4. **Presupuesto:** EC2 t3.micro + RDS db.t3.micro + S3 + Lambda se mantienen
   muy por debajo de $50/mes, especialmente destruyendo la infraestructura
   con `terraform destroy` entre sesiones de trabajo.

## Consecuencias

- **Positivas:** la combinación permite demostrar de punta a punta el ciclo
  "modernización" (de monolito a monolito + función reactiva) sin necesitar
  servicios fuera del alcance del Learner Lab.
- **Negativas:** al no usar contenedores orquestados (ECS/EKS) ni
  balanceadores de carga, la disponibilidad y escalabilidad de la app
  EC2 son limitadas — aceptable para el alcance académico del proyecto.
- **Seguimiento:** las decisiones de implementación derivadas de esta
  elección se documentan en ADR-002 (cómputo) y ADR-003 (secretos).

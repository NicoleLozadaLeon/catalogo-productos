# ADR-002: EC2 + Docker en lugar de EKS/ECS para alojar la aplicación

## Estado
Aceptado

## Contexto

La aplicación necesita un entorno de cómputo donde correr el contenedor de
Express. Las alternativas evaluadas fueron:

1. **Amazon EKS** (Kubernetes administrado).
2. **Amazon ECS** (orquestación de contenedores nativa de AWS, Fargate o EC2).
3. **Una sola instancia EC2 corriendo Docker directamente.**

## Decisión

Se eligió una **única instancia EC2 t3.micro corriendo el contenedor con
Docker directamente** (sin orquestador), administrada íntegramente por
Terraform (módulo `compute`).

## Justificación

1. **Restricción de IAM del Learner Lab:** EKS y ECS requieren crear roles
   de servicio específicos (`eksServiceRole`, `ecsTaskExecutionRole`, roles
   para el control plane, etc.). El Learner Lab **no permite crear roles
   IAM nuevos** — solo se puede usar `LabRole`/`LabInstanceProfile`
   preexistentes. Esto hace inviable un despliegue estándar de EKS/ECS sin
   workarounds frágiles.
2. **Costo:** EKS tiene un cargo fijo por el control plane (~$0.10/hora,
   ~$73/mes) que por sí solo excede el presupuesto total del proyecto
   ($50). ECS con Fargate también introduce costos adicionales por
   vCPU/memoria reservada. Una EC2 t3.micro cuesta una fracción de eso
   (~$7.5/mes) y se puede apagar entre sesiones.
3. **Escala del proyecto:** se trata de una sola aplicación monolítica sin
   necesidad de escalado horizontal, balanceo entre múltiples réplicas ni
   orquestación de varios microservicios. La complejidad operativa de un
   clúster de Kubernetes no se traduce en beneficio real para este caso de
   uso académico.
4. **Tiempo de aprovisionamiento:** un clúster EKS tarda 10-15 minutos en
   crearse y requiere configuración adicional (node groups, add-ons). Una
   EC2 con `user_data` está lista para servir tráfico en pocos minutos,
   lo que es preferible considerando que la infraestructura se crea y
   destruye repetidamente durante el desarrollo.

## Consecuencias

- **Positivas:** despliegue simple, rápido y dentro del presupuesto;
  compatible con las restricciones de IAM del Learner Lab; fácil de explicar
  y depurar en la defensa oral.
- **Negativas:** no hay alta disponibilidad (instancia única, sin
  auto-scaling ni balanceador de carga) ni actualizaciones sin downtime.
  Esto es una limitación aceptada explícitamente dada la naturaleza
  académica y de bajo presupuesto del proyecto.
- **Mitigación parcial:** Docker se usa igualmente (multi-stage build,
  imagen mínima, usuario no-root) para mantener buenas prácticas de
  empaquetado, de forma que migrar a ECS/EKS en el futuro solo requeriría
  cambiar la capa de orquestación, no reescribir la aplicación.

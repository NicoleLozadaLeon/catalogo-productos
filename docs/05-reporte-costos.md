# Reporte de Costos — CatálogoCloud

> **Nota sobre el entorno:** AWS Academy Learner Lab no expone la consola
> completa de **AWS Billing / Cost Explorer** (es una de las restricciones
> propias del entorno educativo: la cuenta subyacente es compartida y
> administrada por AWS Academy). El único indicador de costo disponible es
> el medidor de créditos de la barra superior del Lab ("Used $X of $50"),
> que se usa como fuente real de gasto en este reporte, complementado con
> una estimación teórica por componente según el pricing público de AWS.

---

## 1. Resumen de recursos desplegados

| Recurso | Tipo | Horas estimadas de uso* |
|---|---|---|
| EC2 | t3.micro | ~10-15 h (sesiones de desarrollo/demo) |
| RDS PostgreSQL | db.t3.micro, 20 GB gp2 | ~10-15 h |
| S3 | Standard, < 1 GB | Continuo (costo mínimo) |
| Lambda | 256 MB, pocas invocaciones | Por invocación (segundos) |
| Parameter Store | SecureString estándar | Sin costo |
| Estado de Terraform | S3 bucket pequeño | Continuo (costo mínimo) |

*Estimación basada en `terraform destroy` ejecutado entre sesiones de
trabajo, según la estrategia de control de presupuesto del proyecto.

---

## 2. Estimación de costo por componente (us-east-1, on-demand)

| Componente | Precio de referencia | Costo si estuviera 24/7 un mes | Costo estimado real del proyecto |
|---|---|---|---|
| EC2 t3.micro | ~$0.0104/hora | ~$7.50/mes | < $1 (uso intermitente, destruido entre sesiones) |
| RDS db.t3.micro (PostgreSQL) | ~$0.017/hora + storage | ~$12.50/mes + $2.30 (20 GB gp2) | < $2 (uso intermitente) |
| S3 (almacenamiento + requests) | $0.023/GB-mes + requests | Centavos para < 1 GB | Centavos |
| Lambda | $0.20 / 1M requests + $0.0000166667/GB-s | Prácticamente $0 a baja escala | Centavos |
| Parameter Store (SecureString estándar) | Sin costo | $0 | $0 |
| S3 (estado Terraform) | $0.023/GB-mes | Centavos | Centavos |
| **Total estimado del proyecto** | | | **Muy por debajo de $5** |

**Gasto real confirmado en el Learner Lab: $0.20 de $50** (ver sección 3) —
consistente con la estimación teórica de esta tabla.

> Los precios son de referencia pública de AWS para la región `us-east-1`
> y pueden variar; se incluyen para mostrar el orden de magnitud del gasto,
> no como facturación exacta del Learner Lab (que opera con créditos
> promocionales, no facturación real a una tarjeta).

---

## 3. Gasto real registrado en el Learner Lab

**Captura del medidor de créditos del Learner Lab:**

```
AWS ●   Used $0.2 of $50            02:51   ▶ Start Lab
```

- **Crédito consumido:** $0.20 de $50.00 asignados (0.4% del presupuesto).
- Corresponde al consumo acumulado de las sesiones de desarrollo realizadas
  hasta la fecha (Fases 0 a 7: app local, Docker, Terraform, despliegue en
  EC2+RDS, Lambda/S3, Parameter Store), incluyendo varios ciclos de
  `terraform apply` / `terraform destroy`.
- El Learner Lab no desagrega este monto por servicio (no hay Cost
  Explorer); el desglose de la sección 2 es la estimación teórica de a qué
  servicio correspondería ese gasto, según los recursos efectivamente
  creados en cada sesión.

> Captura tomada el 17/06/2026. Si se realizan más sesiones de prueba antes
> de la defensa, actualizar este número con el valor vigente al momento de
> la entrega.

---

## 4. Estrategia de control de presupuesto aplicada

1. **`terraform destroy` entre sesiones de trabajo:** todos los recursos de
   cómputo y base de datos (los que generan costo por hora) se eliminan al
   finalizar cada sesión y se recrean idénticos en la siguiente gracias al
   estado remoto en S3 — sin esto, dejar EC2 + RDS corriendo un mes
   consumiría ~$20.
2. **Instancias de la categoría más económica** (`t3.micro` /
   `db.t3.micro`) suficientes para una carga de desarrollo/demo.
3. **Sin recursos redundantes:** una sola instancia EC2, sin balanceador de
   carga ni múltiples réplicas, acorde a la escala académica del proyecto.
4. **Lambda y S3 son inherentemente económicos** a esta escala: se paga
   solo por las invocaciones y el almacenamiento realmente usado, sin un
   costo base fijo.

---

## 5. Conclusión

El diseño del proyecto (apagar recursos entre sesiones + instancias mínimas
+ uso de servicios serverless para la carga intermitente) mantiene el gasto
muy por debajo del presupuesto de $50 asignado. El consumo real verificado
en el Learner Lab a la fecha es de **$0.20 (0.4% del presupuesto)**, lo que
deja margen amplio para sesiones adicionales de prueba y la demo final sin
riesgo de agotar el crédito asignado.

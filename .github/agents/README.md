# Compatibilidad LLM de agentes

Estos agentes estan escritos para funcionar con cualquier LLM que soporte instrucciones de sistema o instrucciones personalizadas.

## Reglas de compatibilidad

- No fijar proveedor ni modelo en el frontmatter.
- No usar parametros propietarios (por ejemplo, campos exclusivos de una plataforma).
- Mantener los campos minimos portables en cada agente:
  - `name`
  - `description`
- Escribir prompts en lenguaje natural, sin depender de herramientas exclusivas de un proveedor.
- Evitar referencias de marca dentro de la cabecera del agente.

## Formato recomendado del frontmatter

```yaml
---
name: nombre-del-agente
description: descripcion corta de cuando usar este agente
---
```

## Adaptacion por plataforma (sin cambiar el agente)

- Campo de instrucciones de sistema: pegar el contenido completo del archivo del agente.
- Si la plataforma tiene limites de tokens, priorizar secciones: identidad, principios, metodologia y entregables.
- Si la plataforma no soporta Markdown completo, conservar encabezados y listas planas.

## Checklist rapido antes de publicar cambios

- No existe `model:` en ningun agente.
- No hay nombres de proveedores en la introduccion.
- El agente puede ejecutarse como texto plano en cualquier LLM.
- El objetivo y alcance del agente siguen claros.

## Nota

Si se necesita una version optimizada para una plataforma concreta, crear una variante separada y mantener esta version base como canonica y agnostica.

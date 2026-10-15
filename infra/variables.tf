# Nada de esto es secreto (imágenes públicas, una etiqueta, regiones), así que
# va con default en un archivo que SÍ se commitea.

variable "image_repo_api" {
  description = "Imagen del backend en GHCR, sin etiqueta"
  default     = "ghcr.io/franzago1/ingsoft3-tp01-backend"
}

variable "image_repo_front" {
  description = "Imagen del frontend en GHCR, sin etiqueta"
  default     = "ghcr.io/franzago1/ingsoft3-tp01-frontend"
}

variable "image_tag" {
  # La que publicó el pipeline del TP7 en el último merge a main (CI verde).
  # Preprod corre la imagen de un merge concreto: para cambiarla, se edita esta
  # línea por PR y se recrean los servicios (apply -replace o destroy + apply).
  description = "Etiqueta sha-<commit> de las dos imágenes"
  default     = "sha-4b4f062545c22a2a28993e7151b740e91d2595df"
}

variable "render_region" {
  description = "frankfurt | ohio | oregon | singapore | virginia"
  default     = "oregon"
}

variable "neon_region" {
  description = "Región de Neon; la de AWS Oregon queda al lado de los servicios de Render"
  default     = "aws-us-west-2"
}

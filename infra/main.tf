# Entorno PREPROD de ReservaPadel (TP8).
#
# Un tercer entorno, entre QA y PROD, que no existe hasta que esto se aplica:
#   - un proyecto de Neon propio (base + rol)
#   - dos servicios de Render (api y front) que corren la imagen del TP7
#
# QA y PROD NO están declarados acá a propósito: se crearon a mano en el TP6 y
# este código no los toca. Por eso tampoco aparecen en ningún plan.
#
# Credenciales: ninguna en este archivo. Los providers las leen del entorno:
#   NEON_API_KEY, RENDER_API_KEY, RENDER_OWNER_ID
#
# Estado: sin bloque `backend`, vive en infra/terraform.tfstate, en mi máquina,
# ignorado por git (tiene la password de la base en texto plano).

terraform {
  required_version = ">= 1.5"

  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "0.18.0" # fijada: el repo está archivado y el oficial todavía no salió
    }
    render = {
      source  = "render-oss/render"
      version = "1.9.1"
    }
    random = {
      source  = "hashicorp/random"
      version = "3.7.2"
    }
  }
}

provider "neon" {}   # lee NEON_API_KEY
provider "render" {} # lee RENDER_API_KEY y RENDER_OWNER_ID

# --- La base: un proyecto de Neon propio, que se destruye entero sin rozar QA/PROD ---

resource "neon_project" "preprod" {
  name      = "reservapadel-preprod"
  region_id = var.neon_region

  # Sin esto el primer apply falla: el provider pide 1 día de historial y el
  # tope del plan gratuito son 6 horas.
  history_retention_seconds = 21600
}

resource "neon_role" "preprod" {
  project_id = neon_project.preprod.id
  branch_id  = neon_project.preprod.default_branch_id # default_branch_id, NO branch_id
  name       = "app_preprod_owner"
}

resource "neon_database" "preprod" {
  project_id = neon_project.preprod.id
  branch_id  = neon_project.preprod.default_branch_id
  name       = "app_preprod"
  owner_name = neon_role.preprod.name
}

# --- El secreto de los JWT: lo genera Terraform, nadie lo escribe ---

resource "random_password" "jwt" {
  length  = 48
  special = false
}

locals {
  # La cadena de conexión se ARMA con lo que devolvió Neon; nadie la copia.
  # Mismo formato que QA/PROD (TP6): URI, host directo (no -pooler, porque
  # `prisma migrate deploy` necesita conexión de sesión) y sslmode=require.
  database_url = format(
    "postgresql://%s:%s@%s/%s?sslmode=require",
    neon_role.preprod.name,
    urlencode(neon_role.preprod.password),
    neon_project.preprod.database_host,
    neon_database.preprod.name,
  )
}

# --- Los dos servicios: se CREAN y se DESTRUYEN, nunca se modifican ---
# (en plan free el provider no puede actualizar un servicio: "maintenance mode
# can only be configured for non-free tier services"). Para cambiarles algo:
#   terraform apply -replace=render_web_service.api

resource "render_web_service" "api" {
  name              = "reservapadel-api-preprod"
  plan              = "free"
  region            = var.render_region
  health_check_path = "/api/health"

  runtime_source = {
    image = {
      image_url = var.image_repo_api # SIN la etiqueta
      tag       = var.image_tag      # la etiqueta va en su propio campo
    }
  }

  # APP_COMMIT NO va acá: viene horneado en la imagen, y una variable del
  # servicio la pisaría (el /api/health dejaría de decir qué imagen corre).
  env_vars = {
    DATABASE_URL = { value = local.database_url }
    JWT_SECRET   = { value = random_password.jwt.result }
  }
}

resource "render_web_service" "front" {
  name   = "reservapadel-front-preprod"
  plan   = "free"
  region = var.render_region

  runtime_source = {
    image = {
      image_url = var.image_repo_front
      tag       = var.image_tag
    }
  }

  env_vars = {
    # La dirección del backend sale del atributo `url` de SU api, no de un
    # copy-paste. Sin barra final: el middleware le concatena el path.
    BACKEND_URL = { value = trimsuffix(render_web_service.api.url, "/") }
  }
}

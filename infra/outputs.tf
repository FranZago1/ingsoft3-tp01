# Sólo lo que no es secreto. La cadena de conexión NO sale por output: tiene la
# password del rol, y un output se imprime en la consola y en los logs.

output "db_host" {
  value = neon_project.preprod.database_host
}

output "database" {
  value = neon_database.preprod.name
}

output "api_url" {
  value = render_web_service.api.url
}

output "front_url" {
  value = render_web_service.front.url
}

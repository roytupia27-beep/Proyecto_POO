# Pukllay Sport

Sistema de reserva de canchas de grass sintético, hecho con programación orientada a objetos en Python.

## Pilares de la POO aplicados
- Abstracción: Usuario e IPoliticaCancelacion son clases abstractas.
- Encapsulamiento: atributos privados, @property y setters con validación.
- Herencia: Cliente, Propietario y Administrador heredan de Usuario.
- Polimorfismo: puede_acceder_modulo() responde distinto según el rol.
- Patrón Strategy: política de cancelación y reembolso.
- Singleton y Facade: PukllayService.

## Ejecutar las pruebas
python backend_poo.py

## Variables de entorno (opcionales)
ADMIN_EMAIL, ADMIN_PHONE y ADMIN_PASSWORD definen el administrador.

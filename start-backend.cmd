@echo off
cd /d c:\Users\yassa\E-commerce_Projet\backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev -Dspring-boot.run.arguments=--server.port=8081 > c:\Users\yassa\E-commerce_Projet\backend_run.log 2>&1

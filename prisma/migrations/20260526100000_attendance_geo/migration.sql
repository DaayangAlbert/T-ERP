-- Pointage de présence : coordonnées GPS du bureau (Tenant) + rayon par chantier (Site)
ALTER TABLE "tenants" ADD COLUMN "officeLat" DOUBLE PRECISION;
ALTER TABLE "tenants" ADD COLUMN "officeLng" DOUBLE PRECISION;
ALTER TABLE "tenants" ADD COLUMN "officeRadiusM" INTEGER;

ALTER TABLE "sites" ADD COLUMN "attendanceRadiusM" INTEGER;

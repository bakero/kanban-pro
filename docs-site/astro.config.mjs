import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  integrations: [
    starlight({
      title: "Kanban Pro Docs",
      description: "Documentacion funcional, requisitos y escenarios de prueba.",
      defaultLocale: "es",
      sidebar: [
        { label: "Inicio", link: "/" },
        {
          label: "App",
          items: [
            { label: "Vision general", link: "/app" },
            { label: "Funcionalidades", autogenerate: { directory: "app/funcionalidades" } },
          ],
        },
        {
          label: "Consola de administracion",
          items: [
            { label: "Vision general", link: "/admin" },
            { label: "Funcionalidades", autogenerate: { directory: "admin/funcionalidades" } },
          ],
        },
        {
          label: "QA",
          items: [
            { label: "Ejecuciones", link: "/qa/ejecuciones" },
            { label: "Convenciones", link: "/qa/convenciones" },
          ],
        },
      ],
    }),
  ],
});

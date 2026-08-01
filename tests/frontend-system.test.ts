import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();

function sourceFiles(directory: string): string[] {
  const absoluteDirectory = path.join(repositoryRoot, directory);
  if (!existsSync(absoluteDirectory)) {
    return [];
  }

  return readdirSync(absoluteDirectory).flatMap((entry) => {
    const relativePath = path.join(directory, entry);
    const absolutePath = path.join(repositoryRoot, relativePath);

    if (statSync(absolutePath).isDirectory()) {
      return sourceFiles(relativePath);
    }

    return /\.(?:ts|tsx|css)$/.test(entry) ? [relativePath] : [];
  });
}

describe("frontend design-system boundary", () => {
  it("keeps active source free from legacy shadcn, Base UI, and Radix imports", () => {
    const files = [
      ...sourceFiles("app"),
      ...sourceFiles("components"),
      ...sourceFiles("hooks"),
      ...sourceFiles("lib"),
      ...sourceFiles("styles"),
    ];
    const forbiddenImport =
      /(?:from\s+["']@\/components\/ui|["']@base-ui\/react|["']@radix-ui\/|["']class-variance-authority|@import\s+["']shadcn\/tailwind\.css)/;
    const offenders = files.filter((file) =>
      forbiddenImport.test(readFileSync(path.join(repositoryRoot, file), "utf8")),
    );

    expect(offenders).toEqual([]);
  });

  it("does not declare legacy UI packages or shadcn configuration", () => {
    const packageJson = JSON.parse(
      readFileSync(path.join(repositoryRoot, "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const declaredPackages = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };
    const forbiddenPackages = [
      "@base-ui/react",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-select",
      "class-variance-authority",
      "shadcn",
    ];

    expect(forbiddenPackages.filter((name) => name in declaredPackages)).toEqual([]);
    expect(existsSync(path.join(repositoryRoot, "components.json"))).toBe(false);
    expect(sourceFiles("components/ui")).toEqual([]);
  });

  it("keeps every adopted Untitled source file in the provenance inventory", () => {
    const provenance = readFileSync(
      path.join(repositoryRoot, "docs/third-party/untitled-ui.md"),
      "utf8",
    );
    const adoptedFiles = [
      "components/untitled/base/buttons/button.tsx",
      "components/untitled/base/input/field-parts.tsx",
      "components/untitled/base/input/input.tsx",
      "components/untitled/base/textarea/textarea.tsx",
      "components/untitled/application/modals/modal.tsx",
      "components/untitled/application/loading-indicator/loading-indicator.tsx",
      "components/untitled/application/slideout-menus/slideout-menu.tsx",
      "components/untitled/base/tooltip/tooltip.tsx",
    ];

    for (const file of adoptedFiles) {
      expect(existsSync(path.join(repositoryRoot, file)), file).toBe(true);
      expect(provenance, file).toContain(`\`${file}\``);
    }
  });

  it("uses the Untitled token layer and one canonical class helper", () => {
    const globals = readFileSync(
      path.join(repositoryRoot, "app/globals.css"),
      "utf8",
    );
    const utilityDefinitions = [
      ...sourceFiles("app"),
      ...sourceFiles("components"),
      ...sourceFiles("hooks"),
      ...sourceFiles("lib"),
    ].filter((file) =>
      /export function (?:cn|cx)\s*\(/.test(
        readFileSync(path.join(repositoryRoot, file), "utf8"),
      ),
    );

    expect(globals).toContain('@import "../styles/untitled-theme.css";');
    expect(globals).not.toContain("shadcn/tailwind.css");
    expect(utilityDefinitions).toEqual(["lib/utils.ts"]);
  });
});

import type { LanguageServicePlugin } from "@volar/language-service";
import {
  type JSONDocument,
  type TextDocument,
  getLanguageService,
} from "vscode-json-languageservice";
import customBlockSchema from "./schema.json";
import { createGenerator, type Config } from "ts-json-schema-generator";

type PluginConfig = Pick<Config, "path" | "tsconfig">;

// Modify of https://github.com/johnsoncodehk/volar/blob/master/plugins/json/src/index.ts
export = (config: PluginConfig = {}): LanguageServicePlugin =>
  (context) => {
    const jsonDocuments = new WeakMap<TextDocument, [number, JSONDocument]>();

    const jsonLs = getLanguageService({});
    try {
      const routeMetaSchema = createGenerator({
        skipTypeCheck: true,
        type: "RouteMeta",
        ...config,
      }).createSchema("RouteMeta");
      customBlockSchema.definitions = {
        ...customBlockSchema.definitions,
        ...routeMetaSchema.definitions,
      };
    } catch (e) {
      console.log("[Error] volar-plugin-vue-router:");
      console.log(e);
    }
    jsonLs.configure({
      allowComments: false,
      schemas: [
        {
          fileMatch: ["*.customBlock_route_*.json"],
          uri: "foo://route-custom-block.schema.json",
          schema: customBlockSchema,
        },
      ],
    });

    return {
      complete: {
        // https://github.com/microsoft/vscode/blob/09850876e652688fb142e2e19fd00fd38c0bc4ba/extensions/json-language-features/server/src/jsonServer.ts#L150
        triggerCharacters: ['"', ":"],

        on(document, position) {
          return worker(document, async (jsonDocument) => {
            return await jsonLs.doComplete(document, position, jsonDocument);
          });
        },

        async resolve(item) {
          return await jsonLs.doResolve(item);
        },
      },

      validation: {
        onSyntactic(document) {
          return worker(document, async (jsonDocument) => {
            return await jsonLs.doValidation(document, jsonDocument);
          });
        },
      },

      doHover(document, position) {
        return worker(document, async (jsonDocument) => {
          return await jsonLs.doHover(document, position, jsonDocument);
        });
      },
    };

    function worker<T>(
      document: TextDocument,
      callback: (jsonDocument: JSONDocument) => T
    ) {
      const jsonDocument = getJsonDocument(document);
      if (!jsonDocument) return;

      return callback(jsonDocument);
    }

    function getJsonDocument(textDocument: TextDocument) {
      if (
        textDocument.languageId !== "json" &&
        textDocument.languageId !== "jsonc"
      )
        return;

      const cache = jsonDocuments.get(textDocument);
      if (cache) {
        const [cacheVersion, cacheDoc] = cache;
        if (cacheVersion === textDocument.version) {
          return cacheDoc;
        }
      }

      const doc = jsonLs.parseJSONDocument(textDocument);
      jsonDocuments.set(textDocument, [textDocument.version, doc]);

      return doc;
    }
  };

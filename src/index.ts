import type { LanguageServicePlugin } from "@volar/language-service";
import * as json from "vscode-json-languageservice";
import * as vscode from "vscode-languageserver-protocol";
import { TextDocument } from "vscode-languageserver-textdocument";
import schemaJson from "./schema.json";
import { createGenerator, type Config } from "ts-json-schema-generator";

// const config: Config = {
//   path: "./route-type.d.ts",
//   type: "CustomRouteBlock",
// };

// Modify of https://github.com/johnsoncodehk/volar/blob/master/plugins/json/src/index.ts
export = function (config?: Config): LanguageServicePlugin {
  const jsonDocuments = new WeakMap<
    TextDocument,
    [number, json.JSONDocument]
  >();

  let jsonLs: json.LanguageService;
  const schema = config
    ? createGenerator(config).createSchema(config.type)
    : schemaJson;

  return {
    setup(_context) {
      jsonLs = json.getLanguageService({});
      jsonLs.configure({
        allowComments: false,
        schemas: [
          {
            fileMatch: ["*.customBlock_route_*.json"],
            uri: "foo://route-custom-block.schema.json",
            schema: schema as any,
          },
        ],
      });
    },

    complete: {
      // https://github.com/microsoft/vscode/blob/09850876e652688fb142e2e19fd00fd38c0bc4ba/extensions/json-language-features/server/src/jsonServer.ts#L150
      triggerCharacters: ['"', ":"],

      on(document, position, context) {
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
          return (await jsonLs.doValidation(
            document,
            jsonDocument
          )) as vscode.Diagnostic[];
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
    callback: (jsonDocument: json.JSONDocument) => T
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

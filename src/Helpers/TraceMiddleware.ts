import { createNamespace, getNamespace, Namespace } from "cls-hooked";

const NAMESPACE_NAME = "traceId";

const generateFallbackTraceId = () => {
  return Math.random().toString(36).substring(2, 15);
};

const getOrCreateNamespace = (): Namespace => {
  return getNamespace(NAMESPACE_NAME) || createNamespace(NAMESPACE_NAME);
};

export const traceMiddleware = (req: any, res: any, next: any) => {
  const traceId = req.header("x-trace-id") || generateFallbackTraceId();
  const ns = getOrCreateNamespace();

  ns.run(() => {
    ns.set("correlationId", traceId);
    req.traceId = traceId;
    res.setHeader("x-trace-id", traceId);
    next();
  });
};

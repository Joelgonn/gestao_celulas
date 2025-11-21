// next.config.js
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // CORREÇÃO: Desativar o React Compiler experimental que está causando erros de parsing.
  // Mantenha esta linha comentada ou removida até que o React Compiler esteja estável e totalmente compatível.
  // reactCompiler: true,
};

export default nextConfig;
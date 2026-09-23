import { TikTokLiveConnection } from "tiktok-live-connector";

const username = process.argv[2]?.trim().replace(/^@/, "");

if (!username) {
  console.error("Informe o usuário do TikTok.");
  process.exit(1);
}

console.log(`Testando @${username}...`);

const connection = new TikTokLiveConnection(username, {
  processInitialData: false,
  enableExtendedGiftInfo: false
});

try {
  const roomId = await connection.fetchRoomId();

  console.log("");
  console.log("SUCESSO");
  console.log(`Room ID: ${roomId}`);
} catch (error) {
  console.log("");
  console.log("FALHA AO DESCOBRIR ROOM ID");
  console.log(`Erro principal: ${error?.message ?? error}`);

  const errors = error?.config?.requestErrs ?? [];

  console.log("");
  console.log(`Fontes que falharam: ${errors.length}`);

  errors.forEach((err, index) => {
    console.log("");
    console.log(`--- ERRO ${index + 1} ---`);
    console.log(`Rota: ${err?.config?.routeId ?? "desconhecida"}`);
    console.log(`Mensagem: ${err?.message ?? err}`);

    if (err?.config?.requestErr) {
      console.log(
        `Causa: ${
          err.config.requestErr.message ??
          String(err.config.requestErr)
        }`
      );
    }
  });

  console.log("");
  console.log("DETALHES COMPLETOS:");
  console.dir(error, { depth: 8 });

  process.exit(1);
}

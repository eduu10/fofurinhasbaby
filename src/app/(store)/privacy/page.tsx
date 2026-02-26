import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/product/product-grid";
import { Shield, Eye, Lock, Database, UserCheck, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Politica de Privacidade",
  description: "Saiba como a Fofurinhas Baby coleta, utiliza e protege seus dados pessoais. Transparencia e seguranca para voce.",
};

async function getFeaturedProducts() {
  try {
    return await prisma.product.findMany({
      where: { isActive: true, isDraft: false, isFeatured: true },
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
      take: 4,
    });
  } catch {
    return [];
  }
}

export default async function PrivacyPage() {
  const products = await getFeaturedProducts();

  return (
    <div className="bg-[#FDFBF7] min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-r from-baby-blue/20 to-baby-pink/20 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Politica de <span className="text-baby-pink">Privacidade</span>
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            A Fofurinhas Baby respeita a sua privacidade. Saiba como coletamos, utilizamos e protegemos seus dados pessoais.
          </p>
          <p className="text-sm text-gray-400 mt-4">Ultima atualizacao: Fevereiro de 2026</p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Destaques */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16">
          {[
            { icon: Lock, title: "Dados Criptografados", desc: "SSL 256 bits em todas as paginas", color: "text-green-500", bg: "bg-green-50" },
            { icon: Eye, title: "Transparencia Total", desc: "Voce sabe exatamente o que coletamos", color: "text-baby-blue", bg: "bg-baby-blue/10" },
            { icon: UserCheck, title: "Seus Direitos", desc: "Acesse, corrija ou exclua seus dados", color: "text-baby-pink", bg: "bg-baby-pink/10" },
          ].map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <div className={`w-12 h-12 ${item.bg} rounded-full flex items-center justify-center mx-auto mb-3`}>
                <item.icon size={24} className={item.color} />
              </div>
              <h3 className="font-display font-bold text-gray-800 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Seções da Política */}
        <div className="space-y-10">
          {/* 1. Coleta de Dados */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Database size={24} className="text-baby-blue" />
              1. Dados que Coletamos
            </h2>
            <div className="text-sm text-gray-600 leading-relaxed space-y-4">
              <p>Coletamos informacoes que voce nos fornece diretamente ao usar nossa loja, incluindo:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-baby-pink rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Dados de cadastro:</strong> Nome completo, e-mail, telefone e senha (criptografada).</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-baby-pink rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Dados de entrega:</strong> Endereco completo para envio dos pedidos (rua, numero, complemento, bairro, cidade, estado e CEP).</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-baby-pink rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Dados de pagamento:</strong> Os dados do cartao sao processados diretamente pelas plataformas de pagamento (Stripe/Mercado Pago) e nao sao armazenados em nossos servidores.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-baby-pink rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Dados de navegacao:</strong> Cookies, endereco IP, tipo de navegador e paginas visitadas para melhorar a experiencia de compra.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 2. Uso dos Dados */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Shield size={24} className="text-accent-orange" />
              2. Como Usamos seus Dados
            </h2>
            <div className="text-sm text-gray-600 leading-relaxed space-y-4">
              <p>Utilizamos seus dados pessoais para as seguintes finalidades:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-accent-orange rounded-full mt-1.5 flex-shrink-0" />
                  <span>Processar e entregar seus pedidos com seguranca e agilidade.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-accent-orange rounded-full mt-1.5 flex-shrink-0" />
                  <span>Enviar atualizacoes sobre o status do seu pedido por e-mail e WhatsApp.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-accent-orange rounded-full mt-1.5 flex-shrink-0" />
                  <span>Personalizar sua experiencia de compra com recomendacoes de produtos.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-accent-orange rounded-full mt-1.5 flex-shrink-0" />
                  <span>Enviar ofertas e promocoes exclusivas (somente se voce autorizar).</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-accent-orange rounded-full mt-1.5 flex-shrink-0" />
                  <span>Cumprir obrigacoes legais e fiscais previstas na legislacao brasileira.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-accent-orange rounded-full mt-1.5 flex-shrink-0" />
                  <span>Prevenir fraudes e garantir a seguranca das transacoes.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 3. Compartilhamento */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <UserCheck size={24} className="text-baby-pink" />
              3. Compartilhamento de Dados
            </h2>
            <div className="text-sm text-gray-600 leading-relaxed space-y-4">
              <p>A Fofurinhas Baby <strong>nao vende, aluga ou compartilha</strong> seus dados pessoais com terceiros para fins de marketing. Compartilhamos dados apenas com:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-baby-blue rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Processadores de pagamento:</strong> Stripe e Mercado Pago, para processar suas transacoes financeiras de forma segura.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-baby-blue rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Transportadoras e Correios:</strong> Para realizar a entrega dos seus pedidos no endereco informado.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-baby-blue rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Autoridades legais:</strong> Quando exigido por lei, ordem judicial ou para proteger nossos direitos legais.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* 4. Cookies */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Eye size={24} className="text-green-500" />
              4. Cookies e Tecnologias de Rastreamento
            </h2>
            <div className="text-sm text-gray-600 leading-relaxed space-y-4">
              <p>Utilizamos cookies e tecnologias semelhantes para:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                  <span>Manter voce logado em sua conta durante a navegacao.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                  <span>Lembrar os itens adicionados ao seu carrinho de compras.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                  <span>Entender como voce navega pelo site para melhorar a usabilidade.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                  <span>Exibir anuncios relevantes baseados nos seus interesses.</span>
                </li>
              </ul>
              <p>Voce pode desativar os cookies nas configuracoes do seu navegador, mas isso pode afetar algumas funcionalidades do site.</p>
            </div>
          </section>

          {/* 5. Seus Direitos */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Lock size={24} className="text-baby-blue" />
              5. Seus Direitos (LGPD)
            </h2>
            <div className="text-sm text-gray-600 leading-relaxed space-y-4">
              <p>De acordo com a Lei Geral de Protecao de Dados (LGPD - Lei 13.709/2018), voce tem os seguintes direitos:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-baby-blue rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Acesso:</strong> Solicitar uma copia de todos os dados pessoais que possuimos sobre voce.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-baby-blue rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Correcao:</strong> Solicitar a correcao de dados incompletos, inexatos ou desatualizados.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-baby-blue rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Exclusao:</strong> Solicitar a exclusao dos seus dados pessoais, exceto quando houver obrigacao legal de retencao.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-baby-blue rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Portabilidade:</strong> Solicitar a portabilidade dos seus dados para outro fornecedor de servico.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-baby-blue rounded-full mt-1.5 flex-shrink-0" />
                  <span><strong>Revogacao:</strong> Revogar o consentimento para o uso dos seus dados a qualquer momento.</span>
                </li>
              </ul>
              <p>Para exercer qualquer um desses direitos, entre em contato conosco pelo e-mail <strong>contato@fofurinhasbaby.com.br</strong>.</p>
            </div>
          </section>

          {/* 6. Segurança */}
          <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Shield size={24} className="text-green-500" />
              6. Seguranca dos Dados
            </h2>
            <div className="text-sm text-gray-600 leading-relaxed space-y-4">
              <p>Adotamos medidas tecnicas e organizacionais para proteger seus dados pessoais, incluindo:</p>
              <ul className="space-y-2 ml-4">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                  <span>Certificado SSL de 256 bits em todas as paginas do site.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                  <span>Senhas armazenadas com criptografia de ponta (hash + salt).</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                  <span>Dados de pagamento processados por plataformas certificadas PCI DSS.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5 flex-shrink-0" />
                  <span>Acesso restrito aos dados pessoais apenas por funcionarios autorizados.</span>
                </li>
              </ul>
            </div>
          </section>
        </div>

        {/* Galeria de Produtos */}
        {products.length > 0 && (
          <section className="my-16">
            <div className="text-center mb-8">
              <span className="text-baby-pink font-bold tracking-wider uppercase text-sm">Aproveite para conferir</span>
              <h2 className="font-display text-3xl font-bold text-gray-800 mt-2">
                Nossos <span className="text-accent-orange">Destaques</span>
              </h2>
            </div>
            <ProductGrid products={products} />
            <div className="text-center mt-6">
              <Link href="/products" className="text-sm font-semibold text-baby-pink hover:text-pink-400 transition-colors">
                Ver todos os produtos &rarr;
              </Link>
            </div>
          </section>
        )}

        {/* Contato */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
          <Mail size={32} className="text-baby-pink mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">Duvidas sobre Privacidade?</h2>
          <p className="text-gray-600 text-sm mb-4 max-w-lg mx-auto">
            Se voce tiver qualquer duvida sobre como tratamos seus dados pessoais, entre em contato com nosso Encarregado de Protecao de Dados:
          </p>
          <a
            href="mailto:contato@fofurinhasbaby.com.br"
            className="inline-block text-baby-pink font-bold hover:text-pink-400 transition-colors"
          >
            contato@fofurinhasbaby.com.br
          </a>
        </section>
      </div>
    </div>
  );
}

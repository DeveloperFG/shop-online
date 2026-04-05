import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";


const AcceptTerms = () => {

    const sections = [
        {
            number: "1",
            title: "Aceitação dos Termos",
            content: (
                <p>
                    Ao acessar ou utilizar a plataforma <strong>aquishopping.com.br</strong>, o usuário
                    declara que leu, compreendeu e concorda integralmente com estes Termos de Uso e com a
                    Política de Privacidade, obrigando-se a cumpri-los.
                </p>
            ),
        },
        {
            number: "2",
            title: "Descrição do Serviço",
            content: (
                <>
                    <p>
                        A plataforma <strong>aquishopping.com.br</strong> é um ambiente digital que permite
                        aos usuários anunciar produtos novos ou usados e entrar em contato com potenciais
                        compradores.
                    </p>
                    <p className="mt-2">
                        A plataforma <strong>não participa</strong> das negociações, não intermedeia vendas
                        e não processa pagamentos.
                    </p>
                </>
            ),
        },
        {
            number: "3",
            title: "Não Intermediação e Natureza da Plataforma",
            content: (
                <>
                    <p>
                        A <strong>aquishopping.com.br</strong> atua exclusivamente como um classificado
                        online. Dessa forma, a plataforma:
                    </p>
                    <ul className="mt-3 space-y-2">
                        {[
                            "Não é fornecedora dos produtos anunciados;",
                            "Não intermedeia negociações;",
                            "Não realiza pagamentos ou recebimentos;",
                            "Não oferece garantias sobre produtos ou usuários.",
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </>
            ),
        },
        {
            number: "4",
            title: "Responsabilidade Exclusiva dos Usuários",
            content: (
                <>
                    <p>O usuário reconhece e concorda que:</p>
                    <ul className="mt-3 space-y-2">
                        {[
                            "Toda negociação ocorre por sua conta e risco;",
                            "É responsável por verificar a veracidade das informações;",
                            "Assume integral responsabilidade por compras e vendas realizadas;",
                            "Deve agir conforme a legislação vigente.",
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="mt-4 grid sm:grid-cols-2 gap-4">
                        <div className="rounded-lg bg-orange-50 border border-orange-200 p-4">
                            <p className="font-semibold text-orange-700 mb-2">Responsabilidade do Vendedor</p>
                            <ul className="space-y-1 text-sm text-orange-800">
                                {[
                                    "Existência e propriedade do produto;",
                                    "Qualidade, estado e legalidade;",
                                    "Entrega e cumprimento do acordo.",
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                            <p className="font-semibold text-blue-700 mb-2">Responsabilidade do Comprador</p>
                            <ul className="space-y-1 text-sm text-blue-800">
                                {[
                                    "Avaliar o produto antes da compra;",
                                    "Verificar condições de pagamento e entrega.",
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </>
            ),
        },
        {
            number: "5",
            title: "Limitação de Responsabilidade",
            content: (
                <>
                    <p>
                        Nos termos do artigo 14, §3º, inciso II, do Código de Defesa do Consumidor, a
                        responsabilidade do fornecedor é afastada quando houver culpa exclusiva do consumidor
                        ou de terceiros.
                    </p>
                    <p className="mt-2">
                        Nos termos dos artigos 186 e 927 do Código Civil Brasileiro, qualquer dano causado
                        por ações dos usuários será de responsabilidade exclusiva destes.
                    </p>
                    <p className="mt-3 font-medium">
                        A <strong>aquishopping.com.br</strong> não se responsabiliza por:
                    </p>
                    <ul className="mt-3 space-y-2">
                        {[
                            "Golpes, fraudes ou práticas ilícitas;",
                            "Perdas financeiras;",
                            "Produtos falsificados ou ilegais;",
                            "Descumprimento de acordos;",
                            "Problemas de entrega;",
                            "Danos diretos ou indiretos decorrentes de negociações.",
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </>
            ),
        },
        {
            number: "6",
            title: "Prevenção a Golpes e Boas Práticas",
            content: (
                <>
                    <p>A plataforma recomenda que os usuários:</p>
                    <ul className="mt-3 space-y-2">
                        {[
                            "Não realizem pagamentos antecipados sem garantia;",
                            "Prefiram encontros presenciais em locais públicos;",
                            "Verifiquem a identidade do vendedor/comprador;",
                            "Desconfiem de ofertas muito abaixo do mercado.",
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-3 text-sm text-gray-500">
                        A plataforma não se responsabiliza por prejuízos decorrentes da não observância
                        dessas recomendações.
                    </p>
                </>
            ),
        },
        {
            number: "7",
            title: "Conteúdo Proibido",
            content: (
                <>
                    <p>É proibido anunciar ou praticar:</p>
                    <ul className="mt-3 space-y-2">
                        {[
                            "Produtos ilícitos ou proibidos por lei;",
                            "Conteúdo falso, enganoso ou fraudulento;",
                            "Violação de direitos de terceiros;",
                            "Atividades ilegais.",
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </>
            ),
        },
        {
            number: "8",
            title: "Banimento e Suspensão",
            content: (
                <>
                    <p>
                        A <strong>aquishopping.com.br</strong> poderá, a seu exclusivo critério, sem aviso
                        prévio:
                    </p>
                    <ul className="mt-3 space-y-2">
                        {[
                            "Suspender ou excluir contas;",
                            "Remover anúncios;",
                            "Bloquear usuários suspeitos de fraude ou violação destes termos.",
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-red-400 flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </>
            ),
        },
        {
            number: "9",
            title: "Ausência de Vínculo",
            content: (
                <p>
                    A relação entre usuários é independente da plataforma. Nos termos do artigo 421 do
                    Código Civil Brasileiro, os contratos firmados são de responsabilidade exclusiva das
                    partes envolvidas.
                </p>
            ),
        },
        {
            number: "10",
            title: "Política de Privacidade (LGPD)",
            content: (
                <div className="grid sm:grid-cols-2 gap-4 mt-2">
                    {[
                        {
                            label: "10.1 Dados Coletados",
                            items: ["Nome", "E-mail", "Telefone", "Cidade", "Informações de uso da plataforma"],
                            color: "blue",
                        },
                        {
                            label: "10.2 Finalidade do Uso",
                            items: [
                                "Funcionamento do app",
                                "Comunicação com usuários",
                                "Segurança e prevenção de fraudes",
                            ],
                            color: "green",
                        },
                        {
                            label: "10.3 Compartilhamento",
                            items: [
                                "Quando exigido por lei;",
                                "Mediante ordem judicial;",
                                "Para proteção da própria plataforma.",
                            ],
                            color: "orange",
                            note: "A plataforma não vende dados pessoais.",
                        },
                        {
                            label: "10.4 Direitos do Usuário",
                            items: [
                                "Solicitar acesso aos dados;",
                                "Corrigir informações;",
                                "Solicitar exclusão da conta.",
                            ],
                            color: "purple",
                        },
                    ].map((block, i) => {
                        const colorMap: Record<string, string> = {
                            blue: "bg-blue-50 border-blue-200 text-blue-700",
                            green: "bg-green-50 border-green-200 text-green-700",
                            orange: "bg-orange-50 border-orange-200 text-orange-700",
                            purple: "bg-purple-50 border-purple-200 text-purple-700",
                        };
                        const dotMap: Record<string, string> = {
                            blue: "bg-blue-400",
                            green: "bg-green-400",
                            orange: "bg-orange-400",
                            purple: "bg-purple-400",
                        };
                        return (
                            <div
                                key={i}
                                className={`rounded-lg border p-4 ${colorMap[block.color]}`}
                            >
                                <p className="font-semibold mb-2 text-sm">{block.label}</p>
                                {block.note && (
                                    <p className="text-xs mb-2 opacity-80">{block.note}</p>
                                )}
                                <ul className="space-y-1 text-sm">
                                    {block.items.map((item, j) => (
                                        <li key={j} className="flex items-start gap-2 opacity-90">
                                            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${dotMap[block.color]}`} />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            ),
        },
        {
            number: "11",
            title: "Isenção de Garantias",
            content: (
                <p>
                    A plataforma é fornecida <em>"como está"</em>, sem garantias de funcionamento
                    ininterrupto, ausência de erros ou segurança absoluta.
                </p>
            ),
        },
        {
            number: "12",
            title: "Alterações dos Termos",
            content: (
                <p>
                    Os termos poderão ser alterados a qualquer momento. O uso contínuo da plataforma
                    implica aceitação das alterações.
                </p>
            ),
        },
        {
            number: "13",
            title: "Legislação e Foro",
            content: (
                <p>
                    Este termo será regido pelas leis brasileiras. Fica eleito o foro da comarca do
                    domicílio do usuário, conforme legislação vigente.
                </p>
            ),
        },
        {
            number: "14",
            title: "Contato",
            content: (
                <a
                    href="https://fsolutions.online"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                >
                    https://fsolutions.online
                </a>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">

                {/* Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10 mb-6 text-center">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 mb-4">
                        <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">
                        Termos de Uso, Responsabilidade
                        <br className="hidden sm:block" /> e Política de Privacidade
                    </h1>
                    <p className="mt-2 text-blue-600 font-semibold text-base">aquishopping.com.br</p>
                    <p className="mt-1 text-sm text-gray-400">Última atualização: 05/04/2026</p>
                </div>

                {/* Alert */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
                    <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <p className="text-sm text-amber-800">
                        Ao utilizar a plataforma, você concorda com todos os termos descritos abaixo.
                        Leia com atenção antes de prosseguir.
                    </p>
                </div>

                {/* Sections */}
                <div className="space-y-4">
                    {sections.map((section) => (
                        <div
                            key={section.number}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                        >
                            <div className="flex items-center gap-3 px-5 sm:px-7 py-4 border-b border-gray-100 bg-gray-50">
                                <span className="flex-shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-bold">
                                    {section.number}
                                </span>
                                <h2 className="text-sm sm:text-base font-semibold text-gray-800">
                                    {section.title}
                                </h2>
                            </div>
                            <div className="px-5 sm:px-7 py-5 text-sm sm:text-base text-gray-600 leading-relaxed">
                                {section.content}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer disclaimer */}
                <div className="mt-6 bg-blue-600 rounded-2xl p-6 sm:p-8 text-center text-white">
                    <svg className="w-8 h-8 mx-auto mb-3 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <p className="text-sm sm:text-base font-medium leading-relaxed opacity-95">
                        Ao utilizar a plataforma, o usuário declara estar ciente de que a
                        responsabilidade pelas transações é exclusivamente dos usuários envolvidos.
                    </p>
                </div>

                <p className="text-center text-xs text-gray-400 mt-6 pb-4">
                    © 2026 aquishopping.com.br — Todos os direitos reservados
                </p>
            </div>
        </div>
    );
}

export default AcceptTerms;
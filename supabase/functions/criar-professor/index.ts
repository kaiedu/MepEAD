import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":
        "POST, OPTIONS"
};

Deno.serve(async (req) => {

    /* =========================================
       CORS
    ========================================= */

    if (req.method === "OPTIONS") {

        return new Response("ok", {
            status: 200,
            headers: corsHeaders
        });

    }


    if (req.method !== "POST") {

        return new Response(
            JSON.stringify({
                sucesso: false,
                erro: "Método não permitido."
            }),
            {
                status: 405,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                }
            }
        );

    }


    try {

        /* =========================================
           CLIENTE ADMIN
        ========================================= */

        const supabaseAdmin = createClient(

            Deno.env.get("SUPABASE_URL") ?? "",

            Deno.env.get(
                "SUPABASE_SERVICE_ROLE_KEY"
            ) ?? "",

            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }

        );


        /* =========================================
           TOKEN DO GESTOR
        ========================================= */

        const authHeader =
            req.headers.get("Authorization");


        if (!authHeader) {

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro: "Usuário não autenticado."
                }),
                {
                    status: 401,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        const token =
            authHeader.replace(
                /^Bearer\s+/i,
                ""
            );


        if (!token) {

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro: "Token de autenticação não informado."
                }),
                {
                    status: 401,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        /* =========================================
           IDENTIFICAR USUÁRIO AUTENTICADO
        ========================================= */

        const {
            data: dadosAuth,
            error: erroAuthUsuario
        } =
            await supabaseAdmin.auth.getUser(token);


        if (
            erroAuthUsuario ||
            !dadosAuth?.user
        ) {

            console.error(
                "Erro ao validar token:",
                erroAuthUsuario
            );

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro: "Sua sessão é inválida ou expirou."
                }),
                {
                    status: 401,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        const authIdGestor =
            dadosAuth.user.id;


        /* =========================================
           VERIFICAR GESTOR
        ========================================= */

        const {
            data: usuarioAtual,
            error: erroUsuario
        } =
            await supabaseAdmin
                .from("usuarios")
                .select(
                    "id, auth_id, nome, email, perfil, ativo"
                )
                .eq(
                    "auth_id",
                    authIdGestor
                )
                .maybeSingle();


        if (erroUsuario) {

            console.error(
                "Erro ao buscar gestor:",
                erroUsuario
            );

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro: "Não foi possível verificar suas permissões."
                }),
                {
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        if (!usuarioAtual) {

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro: "Seu perfil não foi encontrado."
                }),
                {
                    status: 403,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        if (
            usuarioAtual.perfil !== "gestor" ||
            usuarioAtual.ativo !== true
        ) {

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro: "Você não possui permissão para criar professores."
                }),
                {
                    status: 403,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        /* =========================================
           RECEBER DADOS
        ========================================= */

        let body;

        try {

            body = await req.json();

        } catch {

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro: "Dados do cadastro inválidos."
                }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        const nome =
            String(
                body?.nome ?? ""
            ).trim();


        const email =
            String(
                body?.email ?? ""
            )
                .trim()
                .toLowerCase();


        const senha =
            String(
                body?.senha ?? ""
            );


        const ativo =
            body?.ativo !== false;


        /* =========================================
           VALIDAÇÕES
        ========================================= */

        if (!nome) {

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro: "Informe o nome completo do professor."
                }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        if (!email) {

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro: "Informe o e-mail do professor."
                }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        const regexEmail =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


        if (!regexEmail.test(email)) {

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro: "Informe um e-mail válido."
                }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        if (senha.length < 6) {

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro:
                        "A senha temporária precisa ter pelo menos 6 caracteres."
                }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        /* =========================================
           VERIFICAR E-MAIL EM usuarios
        ========================================= */

        const {
            data: usuarioExistente,
            error: erroBuscaUsuario
        } =
            await supabaseAdmin
                .from("usuarios")
                .select(
                    "id, email"
                )
                .ilike(
                    "email",
                    email
                )
                .maybeSingle();


        if (erroBuscaUsuario) {

            console.error(
                "Erro ao verificar e-mail:",
                erroBuscaUsuario
            );

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro:
                        "Não foi possível verificar o e-mail informado."
                }),
                {
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        if (usuarioExistente) {

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro:
                        "Já existe um usuário cadastrado com este e-mail."
                }),
                {
                    status: 409,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        /* =========================================
           CRIAR USUÁRIO NO SUPABASE AUTH
        ========================================= */

        const {
            data: novoAuth,
            error: erroCriacaoAuth
        } =
            await supabaseAdmin.auth.admin.createUser({

                email: email,

                password: senha,

                email_confirm: true,

                user_metadata: {
                    nome: nome,
                    perfil: "professor"
                }

            });


        if (erroCriacaoAuth) {

            console.error(
                "Erro ao criar usuário no Auth:",
                erroCriacaoAuth
            );

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro:
                        erroCriacaoAuth.message ||
                        "Não foi possível criar a conta do professor."
                }),
                {
                    status: 400,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        if (!novoAuth?.user?.id) {

            console.error(
                "Supabase Auth não retornou ID do usuário."
            );

            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro:
                        "O Supabase não retornou os dados da conta criada."
                }),
                {
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        const novoAuthId =
            novoAuth.user.id;


        /* =========================================
           CRIAR PERFIL EM usuarios
        ========================================= */

        const {
            data: novoUsuario,
            error: erroBanco
        } =
            await supabaseAdmin
                .from("usuarios")
                .insert({

                    auth_id:
                        novoAuthId,

                    nome:
                        nome,

                    email:
                        email,

                    perfil:
                        "professor",

                    ativo:
                        ativo,

                    primeiro_acesso:
                        true

                })
                .select(
                    "id, auth_id, nome, email, perfil, ativo, primeiro_acesso, created_at"
                )
                .single();


        /* =========================================
           ROLLBACK AUTH
        ========================================= */

        if (erroBanco) {

            console.error(
                "Erro ao criar perfil em usuarios:",
                erroBanco
            );


            const {
                error: erroRollback
            } =
                await supabaseAdmin
                    .auth
                    .admin
                    .deleteUser(
                        novoAuthId
                    );


            if (erroRollback) {

                console.error(
                    "Erro ao desfazer usuário Auth:",
                    erroRollback
                );

            }


            return new Response(
                JSON.stringify({
                    sucesso: false,
                    erro:
                        "A conta foi criada no Auth, mas não foi possível concluir o cadastro do professor."
                }),
                {
                    status: 500,
                    headers: {
                        ...corsHeaders,
                        "Content-Type": "application/json"
                    }
                }
            );

        }


        /* =========================================
           SUCESSO
        ========================================= */

        return new Response(
            JSON.stringify({

                sucesso: true,

                mensagem:
                    "Professor criado com sucesso.",

                usuario:
                    novoUsuario

            }),
            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                }
            }
        );


    } catch (erro) {

        console.error(
            "Erro inesperado na Edge Function criar-professor:",
            erro
        );


        return new Response(
            JSON.stringify({

                sucesso: false,

                erro:
                    erro instanceof Error
                        ? erro.message
                        : "Erro interno ao criar o professor."

            }),
            {
                status: 500,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                }
            }
        );

    }

});
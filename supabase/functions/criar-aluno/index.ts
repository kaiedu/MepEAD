import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {

    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: corsHeaders,
        });
    }

    try {

        const supabaseUrl =
            Deno.env.get("SUPABASE_URL");

        const serviceRoleKey =
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

        if (!supabaseUrl || !serviceRoleKey) {

            throw new Error(
                "Configuração do Supabase não encontrada."
            );

        }

        const supabaseAdmin =
            createClient(
                supabaseUrl,
                serviceRoleKey,
                {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                    },
                }
            );


        /* ================================
           DADOS RECEBIDOS
        ================================= */

        const body = await req.json();

        const nome =
            String(body.nome || "").trim();

        const email =
            String(body.email || "").trim().toLowerCase();

        const senha =
            String(body.senha || "");

        const ativo =
            body.ativo !== false;


        /* ================================
           VALIDAÇÃO
        ================================= */

        if (!nome) {
            throw new Error(
                "O nome do aluno é obrigatório."
            );
        }

        if (!email) {
            throw new Error(
                "O e-mail do aluno é obrigatório."
            );
        }

        if (!senha || senha.length < 6) {
            throw new Error(
                "A senha deve possuir pelo menos 6 caracteres."
            );
        }


        /* ================================
           VERIFICAR SE E-MAIL JÁ EXISTE
        ================================= */

        let pagina = 1;
        let usuarioExistente = null;

        while (!usuarioExistente) {

            const {
                data: usuariosAuth,
                error: erroUsuarios,
            } =
                await supabaseAdmin.auth.admin
                    .listUsers({
                        page: pagina,
                        perPage: 1000,
                    });

            if (erroUsuarios) {
                throw erroUsuarios;
            }

            usuarioExistente =
                usuariosAuth.users.find(
                    (usuario) =>
                        usuario.email?.toLowerCase() === email
                ) || null;

            if (
                usuariosAuth.users.length < 1000
            ) {
                break;
            }

            pagina++;
        }


        if (usuarioExistente) {

            throw new Error(
                "Já existe uma conta com este e-mail."
            );

        }


        /* ================================
           CRIAR USUÁRIO NO AUTH
        ================================= */

        const {
            data: novoUsuario,
            error: erroAuth,
        } =
            await supabaseAdmin.auth.admin
                .createUser({
                    email: email,
                    password: senha,
                    email_confirm: true,
                    user_metadata: {
                        nome: nome,
                        perfil: "aluno",
                    },
                });


        if (erroAuth) {
            throw erroAuth;
        }

        if (!novoUsuario.user) {

            throw new Error(
                "Não foi possível criar o usuário."
            );

        }


        /* ================================
           CRIAR PERFIL
        ================================= */

        const {
            data: perfil,
            error: erroPerfil,
        } =
            await supabaseAdmin
                .from("usuarios")
                .insert({
                    auth_id: novoUsuario.user.id,
                    nome: nome,
                    email: email,
                    perfil: "aluno",
                    ativo: ativo,
                })
                .select()
                .single();


        /* ================================
           ERRO AO CRIAR PERFIL
        ================================= */

        if (erroPerfil) {

            /*
             * Se o perfil falhar, removemos
             * também o usuário do Auth para
             * evitar uma conta incompleta.
             */

            await supabaseAdmin.auth.admin
                .deleteUser(
                    novoUsuario.user.id
                );

            throw erroPerfil;

        }


        /* ================================
           SUCESSO
        ================================= */

        return new Response(

            JSON.stringify({
                success: true,
                message:
                    "Aluno criado com sucesso.",
                usuario: perfil,
            }),

            {
                status: 200,
                headers: {
                    ...corsHeaders,
                    "Content-Type":
                        "application/json",
                },
            }

        );

    }

    catch (error) {

        console.error(
            "Erro criar-aluno:",
            error
        );

        return new Response(

            JSON.stringify({
                success: false,
                message:
                    error instanceof Error
                        ? error.message
                        : "Erro ao criar aluno.",
            }),

            {
                status: 400,
                headers: {
                    ...corsHeaders,
                    "Content-Type":
                        "application/json",
                },
            }

        );

    }

});
import { dedupExchange, errorExchange, fetchExchange, stringifyVariables } from "urql";
import { cacheExchange, Resolver, Cache } from "@urql/exchange-graphcache";
import { LoginMutation, LogoutMutation, MeQuery, MeDocument, RegisterMutation, VoteMutationVariables, DeletePostMutationVariables } from "../generated/graphql";
import { betterUpdateQuery } from "./betterUpdateQuery";
import Router from "next/router";
import { gql } from "@urql/core";
import { isServer } from "./isServer";

function invalidateAllPosts(cache: Cache) {
  cache.inspectFields('Query')
    .filter(info => info.fieldName === 'posts')
    .forEach((fi) => {
      cache.invalidate('Query', 'posts', fi.arguments || {});
    })
}

export const createUrqlClient = (ssrExchange: any, ctx: any) => {
  let cookie = "";
  if (isServer()) {
    cookie = ctx?.req.headers.cookie;
  }

  return {
    url: 'http://localhost:4000/graphql',
    fetchOptions: {
      credentials: "include" as const,
      headers: cookie ? { cookie } : undefined,
    },
    exchanges: [
      dedupExchange,
      cacheExchange({
        keys: {
          PaginatedPosts: () => null,
        },
        resolvers: {
          Query: {
            posts: cursorPagination(),
          },
        },
        updates: {
          Mutation: {
            deletePost: (_result, args, cache, info) => {
              cache.invalidate({ __typename: "Post", id: (args as DeletePostMutationVariables).id });
            },
            vote: (_result, args, cache, info) => {
              const { postId, value } = args as VoteMutationVariables;
              const data = cache.readFragment(
                gql`
                fragment _ on Post {
                  id
                  points
                  voteStatus
                }
              `,
                { id: postId }
              );
              if (data) {
                if (data.voteStauts == value) {
                  return;
                }
                const newPoints = (data.points as number) + ((!data.voteStatus) ? 1 : 2) * value;
                cache.writeFragment(
                  gql`
                  fragment __ on Post {
                    points
                    voteStatus
                  }
                `,
                  { id: postId, points: newPoints, voteStatus: value }
                )
              }
            },
            createPost: (_result, args, cache, info) => {
              invalidateAllPosts(cache);
            },
            logout: (_result: LoginMutation, args, cache, info) => {
              betterUpdateQuery<LogoutMutation, MeQuery>(
                cache,
                { query: MeDocument },
                _result,
                (result, query) => ({ me: null })
              );
            },
            login: (_result: LoginMutation, args, cache, info) => {
              betterUpdateQuery<LoginMutation, MeQuery>(
                cache,
                { query: MeDocument },
                _result,
                (result, query) => {
                  if (result.login.errors) {
                    return query;
                  } else {
                    return {
                      me: result.login.user,
                    };
                  }
                }
              );
              invalidateAllPosts(cache);
            },
            register: (_result: RegisterMutation, args, cache, info) => {
              betterUpdateQuery<RegisterMutation, MeQuery>(
                cache,
                { query: MeDocument },
                _result,
                (result, query) => {
                  if (result.register.errors) {
                    return query;
                  } else {
                    return {
                      me: result.register.user,
                    };
                  }
                }
              );
            },
          },
        },
      }),
      errorExchange({
        onError(error) {
          if (error?.message.includes("not authenticated")) {
            Router.replace("/login");
          }
        }
      }),
      ssrExchange,
      fetchExchange],
  }
};

export type MergeMode = 'before' | 'after';

export const cursorPagination = (
  cursorArgument = 'cursor',
): Resolver => {
  return (_parent, fieldArgs, cache, info) => {
    const { parentKey: entityKey, fieldName } = info;
    const allFields = cache.inspectFields(entityKey);
    const fieldInfos = allFields.filter(info => info.fieldName === fieldName);
    const size = fieldInfos.length;
    if (size === 0) {
      return undefined;
    }

    const fieldKey = `${fieldName}(${stringifyVariables(fieldArgs)})`
    const isItInTheCache = cache.resolve(cache.resolve(entityKey, fieldKey) as string, "posts");
    info.partial = !isItInTheCache;
    let hasMore = true;
    const results = [];
    fieldInfos.forEach(fi => {
      const key = cache.resolve(entityKey, fi.fieldKey) as string;
      const data = cache.resolve(key, 'posts') as string[];
      const _hasMore = cache.resolve(key, 'hasMore') as boolean;
      hasMore = hasMore && _hasMore;
      results.push(...data);
    })

    return {
      __typename: 'PaginatedPosts',
      hasMore: hasMore,
      posts: results
    };
  };
};
/**
 * @pandamarket/types — Shared types between backend and frontend.
 *
 * Naming convention:
 *   - Interfaces are prefixed with `I` (IStore, IProduct…)
 *   - Enums use PascalCase for both type and members
 *   - DTOs are suffixed with `Dto`
 *   - All entity IDs use the `pd_` prefix at runtime
 */

export * from './enums';
export * from './entities';
export * from './dtos';
export * from './errors';

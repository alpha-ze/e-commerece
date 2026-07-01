import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  type CategoryRow,
} from '../models/category';

/**
 * List all categories.
 *
 * Validates: Requirement 13 (public GET)
 */
export async function listCategories(): Promise<CategoryRow[]> {
  return getAllCategories();
}

export interface CreateCategoryInput {
  name: string;
}

export interface CreateCategoryResult {
  category: CategoryRow;
}

/**
 * Create a new category.
 *
 * Throws with code 'DUPLICATE' if the name already exists.
 * Throws with code 'VALIDATION' if name is empty.
 *
 * Validates: Requirements 13.1, 13.2
 */
export async function addCategory(
  input: CreateCategoryInput,
): Promise<CreateCategoryResult> {
  const name = input.name?.trim();
  if (!name) {
    const err = new Error('Category name is required') as Error & { code: string };
    err.code = 'VALIDATION';
    throw err;
  }

  const category = await createCategory(name);
  return { category };
}

export interface UpdateCategoryInput {
  id: number;
  name: string;
}

export interface UpdateCategoryResult {
  category: CategoryRow;
}

/**
 * Update a category's name.
 *
 * Throws with code 'NOT_FOUND' if no category with that ID exists.
 * Throws with code 'DUPLICATE' if the new name is already taken.
 * Throws with code 'VALIDATION' if name is empty.
 *
 * Validates: Requirement 13.3
 */
export async function editCategory(
  input: UpdateCategoryInput,
): Promise<UpdateCategoryResult> {
  const name = input.name?.trim();
  if (!name) {
    const err = new Error('Category name is required') as Error & { code: string };
    err.code = 'VALIDATION';
    throw err;
  }

  const category = await updateCategory(input.id, name);

  if (!category) {
    const err = new Error('Category not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }

  return { category };
}

/**
 * Delete a category.
 *
 * Throws with code 'HAS_PRODUCTS' if products are assigned to it (409).
 * Throws with code 'NOT_FOUND' if no category with that ID exists.
 *
 * Validates: Requirements 13.4, 13.5
 */
export async function removeCategory(id: number): Promise<void> {
  // deleteCategory throws HAS_PRODUCTS or returns false
  const deleted = await deleteCategory(id);
  if (!deleted) {
    const err = new Error('Category not found') as Error & { code: string };
    err.code = 'NOT_FOUND';
    throw err;
  }
}

<?php

namespace App\Policies;

use App\Models\MenuItem;
use App\Models\User;

class MenuItemPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isAdmin()) {
            return true;
        }
        return null;
    }

    public function update(User $user, MenuItem $menuItem): bool
    {
        return $menuItem->kitchen?->chefProfile?->user_id === $user->id;
    }

    public function delete(User $user, MenuItem $menuItem): bool
    {
        return $menuItem->kitchen?->chefProfile?->user_id === $user->id;
    }
}

<?php

namespace App\Policies;

use App\Models\Kitchen;
use App\Models\User;

class KitchenPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isAdmin()) {
            return true;
        }
        return null;
    }

    public function view(User $user, Kitchen $kitchen): bool
    {
        return $kitchen->chefProfile?->user_id === $user->id;
    }

    public function update(User $user, Kitchen $kitchen): bool
    {
        return $kitchen->chefProfile?->user_id === $user->id;
    }

    public function delete(User $user, Kitchen $kitchen): bool
    {
        return $kitchen->chefProfile?->user_id === $user->id;
    }
}

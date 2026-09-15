<?php

namespace App\Policies;

use App\Models\ChefPaymentMethod;
use App\Models\User;

class ChefPaymentMethodPolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->isAdmin()) {
            return true;
        }
        return null;
    }

    public function view(User $user, ChefPaymentMethod $method): bool
    {
        return $method->chefProfile?->user_id === $user->id;
    }

    public function update(User $user, ChefPaymentMethod $method): bool
    {
        return $method->chefProfile?->user_id === $user->id;
    }

    public function delete(User $user, ChefPaymentMethod $method): bool
    {
        return $method->chefProfile?->user_id === $user->id;
    }
}

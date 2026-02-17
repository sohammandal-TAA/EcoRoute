package ai.theaware.stealth.service;

import org.springframework.stereotype.Service;

import ai.theaware.stealth.entity.Users;
import ai.theaware.stealth.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Users findByEmail(String email) {
        return userRepository.findById(email)
                .orElseGet(() -> {
                    Users newUser = new Users();
                    newUser.setEmail(email);
                    newUser.setFullName("Unknown");
                    return userRepository.save(newUser);
                });
    }

    public Users updateOrCreateUser(String email, String name, String avatarUrl) {
        Users user = userRepository.findById(email).orElse(new Users());

        user.setEmail(email);
        user.setFullName(name);
        user.setAvatarUrl(avatarUrl);

        return userRepository.save(user);
    }
}